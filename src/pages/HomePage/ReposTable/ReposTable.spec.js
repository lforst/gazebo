import { render, screen } from '@testing-library/react'
import { subDays } from 'date-fns'

import ReposTable from './ReposTable'
import { useRepos } from 'services/repos/hooks'
import { MemoryRouter, Route } from 'react-router-dom'

jest.mock('services/repos/hooks')

describe('ReposTable', () => {
  let props
  function setup(over = {}, repos) {
    useRepos.mockReturnValue({
      data: {
        repos,
      },
    })
    props = {
      active: true,
      searchValue: '',
      ...over,
    }
    render(
      <MemoryRouter initialEntries={['/gh']}>
        <Route path="/:provider">
          <ReposTable {...props} />
        </Route>
      </MemoryRouter>
    )
  }

  describe('when rendered with active true', () => {
    beforeEach(() => {
      setup(
        {
          active: true,
        },
        [
          {
            private: false,
            author: {
              username: 'owner1',
            },
            name: 'Repo name 1',
            updatedAt: subDays(new Date(), 3),
            coverage: 43,
            active: true,
          },
          {
            private: true,
            author: {
              username: 'owner1',
            },
            name: 'Repo name 2',
            updatedAt: subDays(new Date(), 2),
            coverage: 100,
            active: true,
          },
          {
            private: true,
            author: {
              username: 'owner1',
            },
            name: 'Repo name 3',
            updatedAt: subDays(new Date(), 5),
            active: true,
          },
        ]
      )
    })

    it('calls useRepos with the right data', () => {
      expect(useRepos).toHaveBeenCalledWith({
        active: true,
        term: '',
      })
    })

    it('renders table repo name', () => {
      const buttons = screen.getAllByText(/Repo name/)
      expect(buttons.length).toBe(3)
    })

    it('renders second column', () => {
      const lastseen1 = screen.getByText(/3 days/)
      const lastseen2 = screen.getByText(/2 days/)
      const lastseen3 = screen.getByText(/5 days/)
      expect(lastseen1).toBeInTheDocument()
      expect(lastseen2).toBeInTheDocument()
      expect(lastseen3).toBeInTheDocument()
    })

    it('renders third column', () => {
      const bars = screen.getAllByTestId('org-progress-bar')
      expect(bars.length).toBe(2)
    })

    it('renders handles null coverage', () => {
      const noData = screen.getByText(/No data available/)
      expect(noData).toBeInTheDocument()
    })
  })

  describe('when rendered with active false', () => {
    beforeEach(() => {
      setup(
        {
          active: false,
        },
        [
          {
            private: false,
            author: {
              username: 'owner1',
            },
            name: 'Repo name 1',
            updatedAt: subDays(new Date(), 3),
            coverage: 43,
            active: false,
          },
          {
            private: true,
            author: {
              username: 'owner1',
            },
            name: 'Repo name 2',
            updatedAt: subDays(new Date(), 2),
            coverage: 100,
            active: false,
          },
          {
            private: true,
            author: {
              username: 'owner1',
            },
            name: 'Repo name 3',
            updatedAt: subDays(new Date(), 5),
            coverage: 0,
            active: false,
          },
        ]
      )
    })

    it('calls useRepos with the right data', () => {
      expect(useRepos).toHaveBeenCalledWith({
        active: false,
        term: '',
      })
    })

    it('renders table repo name', () => {
      const buttons = screen.getAllByText(/Repo name/)
      expect(buttons.length).toBe(3)
    })

    it('renders second column', () => {
      const notActiveRepos = screen.getAllByText(/Not yet enabled/)
      expect(notActiveRepos.length).toBe(3)
    })
  })
})
