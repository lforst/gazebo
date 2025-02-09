import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { Suspense } from 'react'
import { MemoryRouter, Route } from 'react-router-dom'
import { useIntersection } from 'react-use'

import config from 'config'

import { SentryBugReporter } from 'sentry'

import DefaultOrgSelector from './DefaultOrgSelector'

jest.mock('react-use/lib/useIntersection')
jest.mock('./GitHubHelpBanner', () => () => 'GitHubHelpBanner')
jest.mock('config')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})
const server = setupServer()

const mockTrialData = {
  baseUnitPrice: 10,
  benefits: [],
  billingRate: 'monthly',
  marketingName: 'Users Basic',
  monthlyUploadLimit: 250,
  value: 'users-basic',
  trialStatus: 'ONGOING',
  trialStartDate: '2023-01-01T08:55:25',
  trialEndDate: '2023-01-10T08:55:25',
  trialTotalDays: 0,
  pretrialUsersCount: 0,
  planUserCount: 1,
  hasSeatsLeft: true,
}

const mockUserData = {
  me: {
    owner: {
      defaultOrgUsername: 'codecov',
    },
    email: 'jane.doe@codecov.io',
    privateAccess: true,
    onboardingCompleted: true,
    businessEmail: 'jane.doe@codecov.io',
    termsAgreement: true,
    user: {
      name: 'Jane Doe',
      username: 'janedoe',
      avatarUrl: 'http://127.0.0.1/avatar-url',
      avatar: 'http://127.0.0.1/avatar-url',
      student: false,
      studentCreatedAt: null,
      studentUpdatedAt: null,
      customerIntent: 'PERSONAL',
    },
    trackingMetadata: {
      service: 'github',
      ownerid: 123,
      serviceId: '123',
      plan: 'users-basic',
      staff: false,
      hasYaml: false,
      bot: null,
      delinquent: null,
      didTrial: null,
      planProvider: null,
      planUserCount: 1,
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
      profile: {
        createdAt: 'timestamp',
        otherGoal: null,
        typeProjects: [],
        goals: [],
      },
    },
  },
}

const mockBusinessUserData = {
  me: {
    owner: {
      defaultOrgUsername: 'codecov',
    },
    email: 'jane.doe@codecov.io',
    privateAccess: true,
    onboardingCompleted: true,
    businessEmail: 'jane.doe@codecov.io',
    termsAgreement: true,
    user: {
      name: 'Jane Doe',
      username: 'janedoe',
      avatarUrl: 'http://127.0.0.1/avatar-url',
      avatar: 'http://127.0.0.1/avatar-url',
      student: false,
      studentCreatedAt: null,
      studentUpdatedAt: null,
      customerIntent: 'BUSINESS',
    },
    trackingMetadata: {
      service: 'github',
      ownerid: 123,
      serviceId: '123',
      plan: 'users-basic',
      staff: false,
      hasYaml: false,
      bot: null,
      delinquent: null,
      didTrial: null,
      planProvider: null,
      planUserCount: 1,
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
      profile: {
        createdAt: 'timestamp',
        otherGoal: null,
        typeProjects: [],
        goals: [],
      },
    },
  },
}

let testLocation
const wrapper =
  (initialEntries = ['/gh/codecov/cool-repo']) =>
  ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Route path="/:provider/:owner/:repo">
          <Suspense fallback={null}>{children}</Suspense>
        </Route>
        <Route
          path="*"
          render={({ location }) => {
            testLocation = location
            return null
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  })
})
afterEach(() => {
  queryClient.clear()
  server.resetHandlers()
})
afterAll(() => {
  server.close()
})

describe('DefaultOrgSelector', () => {
  beforeEach(() => jest.resetModules())

  function setup({
    myOrganizationsData,
    useUserData,
    isValidUser = true,
    trialStatus = 'NOT_STARTED',
    value = 'users-basic',
    privateRepos = true,
  } = {}) {
    const mockMutationVariables = jest.fn()
    const mockTrialMutationVariables = jest.fn()
    const mockMetricMutationVariables = jest.fn()
    const mockWindow = jest.fn()
    window.open = mockWindow
    const fetchNextPage = jest.fn()
    config.SENTRY_DSN = undefined
    const user = userEvent.setup()

    server.use(
      graphql.query('UseMyOrganizations', (req, res, ctx) => {
        if (!!req.variables.after) {
          fetchNextPage(req.variables.after)
        }
        return res(ctx.status(200), ctx.data(myOrganizationsData))
      }),
      graphql.query('CurrentUser', (req, res, ctx) => {
        if (!isValidUser) {
          return res(ctx.status(200), ctx.data({ me: null }))
        }
        return res(ctx.status(200), ctx.data(useUserData))
      }),
      graphql.query('GetPlanData', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.data({
            owner: {
              hasPrivateRepos: privateRepos,
              plan: {
                ...mockTrialData,
                trialStatus,
                value,
              },
              pretrialPlan: {
                baseUnitPrice: 10,
                benefits: [],
                billingRate: 'monthly',
                marketingName: 'Users Basic',
                monthlyUploadLimit: 250,
                value: 'users-basic',
              },
            },
          })
        )
      }),
      graphql.mutation('updateDefaultOrganization', (req, res, ctx) => {
        mockMutationVariables(req.variables)
        return res(
          ctx.status(200),
          ctx.data({
            updateDefaultOrganization: {
              defaultOrg: {
                username: 'criticalRole',
              },
            },
          })
        )
      }),
      graphql.mutation('startTrial', (req, res, ctx) => {
        mockTrialMutationVariables(req?.variables)

        return res(ctx.status(200))
      }),
      graphql.mutation('storeEventMetric', (req, res, ctx) => {
        mockMetricMutationVariables(req?.variables)
        return res(ctx.status(200), ctx.data({ storeEventMetric: null }))
      })
    )

    return {
      user,
      mockMutationVariables,
      mockTrialMutationVariables,
      mockMetricMutationVariables,
      mockWindow,
      fetchNextPage,
    }
  }

  describe('page renders', () => {
    beforeEach(() =>
      setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })
    )

    it('only renders the component after a valid user is returned from the useUser hook', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      let selectLabel = screen.queryByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).not.toBeInTheDocument()

      selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()
    })

    it('renders the select input', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      expect(selectOrg).toBeInTheDocument()
    })

    it('renders the select input with the correct options', async () => {
      const { user } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            owner: {
              username: 'Rula',
              avatarUrl:
                'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
              ownerid: 9,
            },
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      expect(orgInList).toBeInTheDocument()

      const selfOrg = screen.getByRole('option', { name: 'Rula' })
      expect(selfOrg).toBeInTheDocument()

      const addNewOrg = screen.getByRole('option', {
        name: 'plus-circle.svg Install Codecov GitHub app',
      })
      expect(addNewOrg).toBeInTheDocument()
    })

    it('renders without personal organization if user selected business use', async () => {
      const { user } = setup({
        useUserData: mockBusinessUserData,
        myOrganizationsData: {
          me: {
            owner: {
              username: 'janedoe',
              avatarUrl:
                'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
              ownerid: 9,
            },
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      expect(orgInList).toBeInTheDocument()

      const selfOrg = screen.queryByRole('option', { name: 'janedoe' })
      expect(selfOrg).not.toBeInTheDocument()

      const addNewOrg = screen.getByRole('option', {
        name: 'plus-circle.svg Install Codecov GitHub app',
      })
      expect(addNewOrg).toBeInTheDocument()
    })

    it('renders with no organizations found if only personal org if user selected business use', async () => {
      const { user } = setup({
        useUserData: mockBusinessUserData,
        myOrganizationsData: {
          me: {
            owner: {
              username: 'janedoe',
              avatarUrl:
                'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
              ownerid: 9,
            },
            myOrganizations: {
              edges: [],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const selfOrg = screen.queryByRole('option', { name: 'janedoe' })
      expect(selfOrg).not.toBeInTheDocument()

      const noOrgsFound = screen.getByText(/No organizations found/)
      expect(noOrgsFound).toBeInTheDocument()

      const addNewOrg = screen.getByRole('option', {
        name: 'plus-circle.svg Install Codecov GitHub app',
      })
      expect(addNewOrg).toBeInTheDocument()
    })

    it('does not render add org on different providers', async () => {
      const { user } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, {
        wrapper: wrapper(['/gl/codecov/cool-repo']),
      })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      expect(orgInList).toBeInTheDocument()

      const addNewOrg = screen.queryByRole('option', {
        name: 'plus-circle.svg Install Codecov GitHub app',
      })
      expect(addNewOrg).not.toBeInTheDocument()
    })

    it('opens new page on add org select', async () => {
      const { user, mockWindow } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, {
        wrapper: wrapper(['/gh/codecov/cool-repo']),
      })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const addNewOrg = screen.getByRole('option', {
        name: 'plus-circle.svg Install Codecov GitHub app',
      })

      await user.click(addNewOrg)

      await waitFor(() =>
        expect(mockWindow).toHaveBeenCalledWith(
          'https://github.com/apps/codecov/installations/new',
          '_blank'
        )
      )
    })

    it('renders continue button', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })
      expect(submit).toBeInTheDocument()
    })

    it('renders GitHubHelpBanner', async () => {
      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const helpFindingOrg = await screen.findByText(/GitHubHelpBanner/)
      expect(helpFindingOrg).toBeInTheDocument()
    })
  })

  describe('on cancel', () => {
    it('sends user back to the login page', async () => {
      setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const header = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(header).toBeInTheDocument()

      const cancel = await screen.findByRole('link', { name: /Cancel/ })
      await userEvent.click(cancel)

      expect(testLocation.pathname).toBe('/login')
    })
  })

  describe('on submit', () => {
    beforeEach(() => jest.resetAllMocks())
    it('fires update default org mutation', async () => {
      const { user, mockMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue to Codecov/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockMutationVariables).toHaveBeenLastCalledWith({
          input: {
            username: 'criticalRole',
          },
        })
      )

      await waitFor(() =>
        expect(testLocation.pathname).toBe('/gh/criticalRole')
      )
    })

    it('redirects to the default org page', async () => {
      const { user } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(testLocation.pathname).toBe('/gh/criticalRole')
      )
    })
  })

  describe('on submit with no default org', () => {
    beforeEach(() => jest.resetAllMocks())

    it('redirects to self org page', async () => {
      const { user, mockMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockMutationVariables).toHaveBeenLastCalledWith({
          input: {
            username: 'janedoe',
          },
        })
      )

      expect(testLocation.pathname).toBe('/gh/janedoe')
    })

    it('does not fire start trial mutation', async () => {
      const { user, mockTrialMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockTrialMutationVariables).not.toHaveBeenCalled()
      )
    })
  })

  describe('on submit with a self org', () => {
    it('does not fire trial mutation', async () => {
      const { user, mockTrialMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'janedoe',
                    ownerid: 1,
                  },
                },
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'janedoe' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockTrialMutationVariables).not.toHaveBeenCalled()
      )
    })
  })

  describe('on submit with a free plan', () => {
    it('does not fire trial mutation', async () => {
      const { user, mockTrialMutationVariables } = setup({
        useUserData: mockUserData,
        value: 'users-free',
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'chetney' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockTrialMutationVariables).not.toHaveBeenCalled()
      )
    })
  })

  describe('on submit with self org selected', () => {
    beforeEach(() => jest.resetAllMocks())

    it('fires update default org mutation', async () => {
      const { user, mockMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            owner: {
              username: 'Rula',
              avatarUrl:
                'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
              ownerid: 9,
            },
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const selfOrg = screen.getByRole('option', { name: 'Rula' })
      expect(selfOrg).toBeInTheDocument()

      await user.click(selfOrg)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockMutationVariables).toHaveBeenLastCalledWith({
          input: {
            username: 'Rula',
          },
        })
      )
    })

    it('redirects to self org', async () => {
      const { user } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            owner: {
              username: 'Rula',
              avatarUrl:
                'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
              ownerid: 9,
            },
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const selfOrg = screen.getByRole('option', { name: 'Rula' })
      expect(selfOrg).toBeInTheDocument()

      await user.click(selfOrg)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() => expect(testLocation.pathname).toBe('/gh/Rula'))
    })
  })

  describe('on submit with no default org selected', () => {
    beforeEach(() => jest.resetAllMocks())

    it('redirects to self org page', async () => {
      const { user, mockMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockMutationVariables).toHaveBeenLastCalledWith({
          input: {
            username: 'janedoe',
          },
        })
      )

      expect(testLocation.pathname).toBe('/gh/janedoe')
    })
  })

  describe('on submit with a free basic plan', () => {
    beforeEach(() => jest.resetAllMocks())

    it('fires trial mutation', async () => {
      const { user, mockTrialMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
        value: 'users-basic',
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = await screen.findByRole('option', {
        name: 'criticalRole',
      })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockTrialMutationVariables).toHaveBeenLastCalledWith({
          input: {
            orgUsername: 'criticalRole',
          },
        })
      )
    })

    it('does not fire trial mutation with no private repos', async () => {
      const { user, mockTrialMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
        value: 'users-basic',
        privateRepos: false,
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = await screen.findByRole('option', {
        name: 'criticalRole',
      })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockTrialMutationVariables).not.toHaveBeenCalled()
      )
    })

    it('renders load more on load more trigger', async () => {
      const { user } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      const loadMore = await screen.findByText(/Loading more items.../)
      expect(loadMore).toBeInTheDocument()
    })
  })

  describe('on submit with a different trial status', () => {
    it('does not fire trial mutation', async () => {
      const { user, mockTrialMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
        trialStatus: 'IN_PROGRESS',
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      expect(mockTrialMutationVariables).not.toHaveBeenCalled()
    })
  })

  describe('no current user', () => {
    it('redirects to login', async () => {
      setup({
        useUserData: { me: null },
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      await waitFor(() => expect(testLocation.pathname).toBe('/login'))
    })
  })

  describe('on fetch next page', () => {
    it('renders next page', async () => {
      const { user, fetchNextPage } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    username: 'chetney',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })
      useIntersection.mockReturnValue({ isIntersecting: true })

      const selectOrg = await screen.findByRole('button', {
        name: 'Select an organization',
      })

      await user.click(selectOrg)

      await waitFor(() => expect(fetchNextPage).toHaveBeenCalled())
      await waitFor(() => expect(fetchNextPage).toHaveBeenCalledWith('MTI='))
    })
  })

  describe('storing codecov metric', () => {
    it('fires update metric mutation variables', async () => {
      const mockGetItem = jest.spyOn(window.localStorage.__proto__, 'getItem')
      mockGetItem.mockReturnValue(null)
      const { user, mockMetricMutationVariables } = setup({
        useUserData: mockUserData,
        myOrganizationsData: {
          me: {
            myOrganizations: {
              edges: [
                {
                  node: {
                    avatarUrl:
                      'https://avatars0.githubusercontent.com/u/8226205?v=3&s=55',
                    username: 'criticalRole',
                    ownerid: 1,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
            },
          },
        },
      })

      render(<DefaultOrgSelector />, { wrapper: wrapper() })

      const selectLabel = await screen.findByText(
        /Which organization are you working with today?/
      )
      expect(selectLabel).toBeInTheDocument()

      const selectOrg = screen.getByRole('button', {
        name: 'Select an organization',
      })
      await user.click(selectOrg)

      const orgInList = screen.getByRole('option', { name: 'criticalRole' })
      await user.click(orgInList)

      const submit = await screen.findByRole('button', {
        name: /Continue/,
      })

      await user.click(submit)

      await waitFor(() =>
        expect(mockMetricMutationVariables).toHaveBeenCalled()
      )
    })
  })

  describe('sentry user feedback widget', () => {
    describe('when SENTRY_DSN is not defined', () => {
      it('does not render', async () => {
        setup({
          useUserData: mockUserData,
          myOrganizationsData: {
            me: {
              myOrganizations: {
                edges: [],
                pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
              },
            },
          },
        })
        const removeFromDom = jest.fn()
        const createWidget = jest.fn().mockReturnValue({
          removeFromDom,
        })
        SentryBugReporter.createWidget = createWidget
        render(<DefaultOrgSelector />, { wrapper: wrapper() })

        const selectLabel = await screen.findByText(
          /Which organization are you working with today?/
        )
        expect(selectLabel).toBeInTheDocument()

        expect(createWidget).not.toHaveBeenCalled()
        expect(removeFromDom).not.toHaveBeenCalled()
      })
    })

    describe('when SENTRY_DSN is defined', () => {
      it('renders', async () => {
        setup({
          useUserData: mockUserData,
          myOrganizationsData: {
            me: {
              myOrganizations: {
                edges: [],
                pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
              },
            },
          },
        })
        config.SENTRY_DSN = 'dsn'
        const removeFromDom = jest.fn()
        const createWidget = jest.fn().mockReturnValue({
          removeFromDom,
        })
        SentryBugReporter.createWidget = createWidget
        render(<DefaultOrgSelector />, { wrapper: wrapper() })

        const selectLabel = await screen.findByText(
          /Which organization are you working with today?/
        )
        expect(selectLabel).toBeInTheDocument()

        expect(createWidget).toHaveBeenCalled()
        expect(removeFromDom).not.toHaveBeenCalled()
      })

      describe('and component unmounts', () => {
        it('removes the widget from the dom', async () => {
          setup({
            useUserData: mockUserData,
            myOrganizationsData: {
              me: {
                myOrganizations: {
                  edges: [],
                  pageInfo: { hasNextPage: false, endCursor: 'MTI=' },
                },
              },
            },
          })
          config.SENTRY_DSN = 'dsn'
          const removeFromDom = jest.fn()
          const createWidget = jest.fn().mockReturnValue({
            removeFromDom,
          })
          SentryBugReporter.createWidget = createWidget
          const view = render(<DefaultOrgSelector />, { wrapper: wrapper() })

          const selectLabel = await screen.findByText(
            /Which organization are you working with today?/
          )
          expect(selectLabel).toBeInTheDocument()

          expect(createWidget).toHaveBeenCalled()
          expect(removeFromDom).not.toHaveBeenCalled()

          view.unmount()

          expect(removeFromDom).toHaveBeenCalled()
        })
      })
    })
  })
})
