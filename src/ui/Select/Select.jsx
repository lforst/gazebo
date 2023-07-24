import cs from 'classnames'
import { useCombobox } from 'downshift'
import identity from 'lodash/identity'
import pluralize from 'pluralize'
import PropTypes from 'prop-types'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useIntersection } from 'react-use'

import { dataMarketingType } from 'shared/propTypes'
import { providerToName } from 'shared/utils'
import A from 'ui/A'
import Icon from 'ui/Icon'
import SearchField from 'ui/SearchField'
import Spinner from 'ui/Spinner'

const SelectClasses = {
  root: 'relative',
  item: 'block cursor-pointer py-1 px-3 text-sm font-normal',
  button:
    'flex justify-between items-center w-full rounded bg-white text-left whitespace-nowrap disabled:text-ds-gray-quaternary disabled:bg-ds-gray-primary disabled:border-ds-gray-tertiary focus:outline-1',
  ul: 'overflow-hidden rounded-bl rounded-br bg-white border-ds-gray-tertiary absolute w-full z-20 max-h-80 min-w-fit',
  loadMoreTrigger: 'relative top-[-65px] invisible block leading-[0]',
}

const UlVariantClass = {
  default: 'w-full border-gray-ds-tertiary',
  gray: 'w-full border-gray-ds-tertiary',
  text: 'left-0 whitespace-nowrap',
  defaultOrgSelector: 'w-full border-gray-ds-tertiary top-12',
}

const ButtonVariantClass = {
  default: `w-full h-8 px-3 border border-ds-gray-tertiary rounded-md bg-white disabled:text-ds-gray-quaternary disabled:bg-ds-gray-primary disabled:border-ds-gray-tertiary`,
  gray: `w-full h-8 px-3 border border-ds-gray-tertiary rounded-md bg-white disabled:text-ds-gray-quaternary disabled:bg-ds-gray-primary disabled:border-ds-gray-tertiary bg-ds-gray-primary`,
  text: `flex-init text-ds-blue`,
  defaultOrgSelector: `w-full h-12 px-3 border border-ds-gray-tertiary rounded-md bg-white disabled:text-ds-gray-quaternary disabled:bg-ds-gray-primary disabled:border-ds-gray-tertiary`,
}

function getSearchPlaceholder(resourceName) {
  if (resourceName) {
    return `Search for ${pluralize(resourceName)}`
  }
  return 'Search'
}

function LoadMoreTrigger({ intersectionRef, onLoadMore }) {
  return (
    <>
      {onLoadMore ? (
        <span ref={intersectionRef} className={SelectClasses.loadMoreTrigger}>
          Loading more items...
        </span>
      ) : null}
    </>
  )
}

LoadMoreTrigger.propTypes = {
  onLoadMore: PropTypes.func,
  intersectionRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
}

const Select = forwardRef(
  // eslint-disable-next-line complexity
  (
    {
      placeholder = 'Select',
      items,
      onChange,
      value,
      /* renderItem props:
       *  isHover: boolean
       *  isSelected: boolean
       */
      renderItem = identity,
      /* renderSelected props:
       *  placeholder: string / any
       */
      renderSelected,
      ariaName,
      variant = 'default',
      disabled = false,
      dataMarketing,
      onSearch,
      resourceName = '',
      onLoadMore,
      isLoading,
      searchValue = '',
    },
    ref
  ) => {
    const inputRef = useRef(null)
    const intersectionRef = useRef(null)

    const { provider } = useParams()

    const intersection = useIntersection(intersectionRef, {
      root: null,
      rootMargin: '0px',
      threshold: 0,
    })

    useEffect(() => {
      let unMounted = false
      if (intersection?.isIntersecting && onLoadMore) {
        if (unMounted) return
        onLoadMore()
      }

      return () => {
        unMounted = true
      }
    }, [intersection?.isIntersecting, onLoadMore])

    useImperativeHandle(ref, () => ({
      resetSelected: () => reset(),
    }))

    const {
      getInputProps,
      getMenuProps,
      getItemProps,
      getToggleButtonProps,
      isOpen,
      highlightedIndex,
      reset,
      selectedItem,
    } = useCombobox({
      items: items,
      initialSelectedItem: value,
      onSelectedItemChange: ({ selectedItem }) => onChange(selectedItem),
      selectedItem: value,
    })

    function renderButton() {
      const _render = renderSelected || renderItem
      return (
        _render(selectedItem, {
          placeholder,
        }) || placeholder
      )
    }

    function _renderItem(item, index) {
      const isHover = highlightedIndex === index
      const isSelected = selectedItem === item
      return (
        <li
          className={cs(SelectClasses.item, {
            'bg-ds-gray-secondary': isHover,
          })}
          key={`${item}${index}`}
          {...getItemProps({ item, index })}
        >
          {renderItem(item, { isHover, isSelected })}
        </li>
      )
    }

    return (
      <div className={SelectClasses.root}>
        <div>
          <button
            data-marketing={dataMarketing}
            disabled={disabled}
            aria-label={ariaName}
            type="button"
            className={cs(SelectClasses.button, ButtonVariantClass[variant])}
            {...getToggleButtonProps()}
          >
            {renderButton()}
            <Icon
              variant="solid"
              name={isOpen ? 'chevron-up' : 'chevron-down'}
            />
          </button>
          <div
            className={cs(!onSearch && 'hidden', 'absolute', 'inset-x-0 z-10')}
          >
            <div className={cs(!isOpen && 'hidden')}>
              <SearchField
                dataMarketing="select-search"
                variant="topRounded"
                placeholder={getSearchPlaceholder(resourceName)}
                searchValue={searchValue}
                setSearchValue={(search) => !!onSearch && onSearch(search)}
                {...getInputProps({ ref: inputRef })}
              />
            </div>
          </div>
          <ul
            aria-label={ariaName}
            className={cs(
              SelectClasses.ul,
              UlVariantClass[variant],
              {
                'border overflow-scroll': isOpen,
              },
              !!onSearch ? 'top-16' : 'top-8 rounded'
            )}
            {...getMenuProps()}
          >
            {isOpen && (
              <>
                {items.map(_renderItem)}
                {variant === 'defaultOrgSelector' &&
                  providerToName(provider) === 'Github' && (
                    <li className="px-4 py-2 text-ds-blue-darker">
                      <A to={{ pageName: 'codecovAppInstallation' }}>
                        <Icon name="plus-circle" />
                        Add GitHub organization
                      </A>
                    </li>
                  )}
                {items.length === 0 && onSearch && !isLoading && (
                  <p className="px-3 py-1 text-sm font-semibold">
                    No results found
                  </p>
                )}
                {isLoading && (
                  <span className="flex px-3 py-2">
                    <Spinner />
                  </span>
                )}
                <LoadMoreTrigger
                  intersectionRef={intersectionRef}
                  onLoadMore={onLoadMore}
                />
              </>
            )}
          </ul>
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'

Select.propTypes = {
  placeholder: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.any,
  renderItem: PropTypes.func,
  renderSelected: PropTypes.func,
  ariaName: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['default', 'gray', 'text', 'defaultOrgSelector']),
  disabled: PropTypes.bool,
  dataMarketing: dataMarketingType,
  onSearch: PropTypes.func,
  resourceName: PropTypes.string,
  onLoadMore: PropTypes.func,
  isLoading: PropTypes.bool,
  searchValue: PropTypes.string,
}

export default Select
