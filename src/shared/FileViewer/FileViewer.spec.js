import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route } from 'react-router-dom'

import FileViewer from './FileViewer'

jest.mock('services/file/hooks')

describe('FileViewer', () => {
  function setup(change) {
    render(
      <MemoryRouter
        initialEntries={['/gh/codecov/repo-test/blob/master/src/index2.py']}
      >
        <Route path="/:provider/:owner/:repo/blob/:ref/*">
          <FileViewer
            flagNames={[]}
            selectedFlags={[]}
            setSelectedFlags={jest.fn()}
            treePaths={[]}
            coverage={{
              1: 1,
              2: 0,
              3: 1,
              4: 1,
              5: 0,
              6: 1,
              7: 0,
              8: 1,
              9: 1,
              10: 1,
              11: 0,
            }}
            content="testcontent"
            totals={23}
            title={'Title'}
            change={change}
          />
        </Route>
      </MemoryRouter>
    )
  }

  describe('renders without change', () => {
    beforeEach(() => {
      setup(null)
    })

    it('renders toggles', () => {
      expect(screen.getByText(/View coverage by:/)).toBeInTheDocument()
      expect(screen.getByLabelText('show-covered-lines')).toBeInTheDocument()
      expect(screen.getByLabelText('show-partial-lines')).toBeInTheDocument()
      expect(screen.getByLabelText('show-uncovered-lines')).toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('show-covered-lines'))
      fireEvent.click(screen.getByLabelText('show-partial-lines'))
      fireEvent.click(screen.getByLabelText('show-uncovered-lines'))
    })
    it('renders code', () => {
      expect(screen.getByText('testcontent')).toBeInTheDocument()
    })
    it('renders title', () => {
      expect(screen.getByText('Title')).toBeInTheDocument()
    })
  })

  describe('renders with change', () => {
    beforeEach(() => {
      setup(76)
    })

    it('renders toggles', () => {
      expect(screen.getByText(/View coverage by:/)).toBeInTheDocument()
      expect(screen.getByLabelText('show-covered-lines')).toBeInTheDocument()
      expect(screen.getByLabelText('show-partial-lines')).toBeInTheDocument()
      expect(screen.getByLabelText('show-uncovered-lines')).toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('show-covered-lines'))
      fireEvent.click(screen.getByLabelText('show-partial-lines'))
      fireEvent.click(screen.getByLabelText('show-uncovered-lines'))
    })
    it('renders change', () => {
      expect(screen.getByText(/76/)).toBeInTheDocument()
    })
    it('renders title', () => {
      expect(screen.getByText('Title')).toBeInTheDocument()
    })
    it('renders code', () => {
      expect(screen.getByText('testcontent')).toBeInTheDocument()
    })
  })
})
