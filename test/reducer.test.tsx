import * as React from 'react'
import { withViewModel } from '@rxreact/core'
import { mount, ReactWrapper } from 'enzyme'
import { viewModelWithState } from '../src/reducer'

interface State {
  count: number
  fruit: string
  extra: string
}

interface Actions {
  setCount: number
  setFruit: string
}

interface Selections {
  summary: string
}

let viewModel = viewModelWithState<State, Actions, Selections>({
  initialState: {
    count: 2,
    fruit: 'bananas',
    extra: 'applesauce'
  },
  reducers: {
    setCount: (state, count) => {
      console.log(count)
      return { ...state, count }
    },
    setFruit: (state, fruit) => {
      return { ...state, fruit }
    }
  },
  selectors: {
    summary: state => `${state.count} ${state.fruit} ${state.extra}`
  }
})

interface ComponentProps {
  otherProp: string
  summary: string
  setCount: (_: number) => void
  setFruit: (_: string) => void
}

class Component extends React.Component<ComponentProps> {
  render() {
    const { otherProp, summary, setCount, setFruit } = this.props
    return (
      <div>
        <p id="other">{otherProp}</p>
        <p id="state">We have {summary}</p>
        <button id="number-button" onClick={() => setCount(6)}>
          Set the number of things to 6
        </button>
        <button id="string-button" onClick={() => setFruit('apples')}>
          Set the thing to be apples
        </button>
      </div>
    )
  }
}

describe('viewModelFromReducer', () => {
  let rendered: ReactWrapper<any, any>

  beforeEach(() => {
    let ComponentWithViewModel = withViewModel(viewModel)(Component)
    rendered = mount(<ComponentWithViewModel otherProp={'cheese'} />)
  })
  afterEach(() => {
    rendered.unmount()
  })

  it('renders passed in properties', () => {
    expect(rendered.find('#other').text()).toContain('cheese')
  })

  it('renders initial state', () => {
    expect(rendered.find('#state').text()).toContain('We have 2 bananas')
  })

  describe('when actions are called', () => {
    it('updates the dom as state changes', () => {
      rendered.find('#number-button').simulate('click')
      expect(rendered.find('#state').text()).toContain('We have 6 bananas')
      rendered.find('#string-button').simulate('click')
      expect(rendered.find('#state').text()).toContain('We have 6 apples')
    })
  })

  describe('when props change', () => {
    it('updates the dom as expected', () => {
      rendered.setProps({ otherProp: 'moldy cheese' })
      expect(rendered.find('#other').text()).toContain('moldy cheese')
    })
  })
})
