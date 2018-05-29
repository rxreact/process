import * as React from 'react'
import { withViewModel } from '@rxreact/core'
import { mount, ReactWrapper } from 'enzyme'
import { ReducerResult, viewModelFromReducer } from '../src/reducer'

interface State {
  count: number
  fruit: string
  extra: string
}

enum ActionType {
  SET_COUNT,
  SET_FRUIT
}

type Action =
  | {
      type: ActionType.SET_COUNT
      payload: number
    }
  | {
      type: ActionType.SET_FRUIT
      payload: string
    }

let viewModel = viewModelFromReducer<State, Action, never>({
  initialState: {
    count: 2,
    fruit: 'bananas',
    extra: 'applesauce'
  },
  reducer(state, action) {
    switch (action.type) {
      case ActionType.SET_COUNT:
        return ReducerResult.Update({ ...state, count: action.payload })
      case ActionType.SET_FRUIT:
        return ReducerResult.Update({ ...state, fruit: action.payload })
    }
  },
  sideEffects: {}
})

interface ComponentProps {
  otherProp: string
  count: number
  fruit: string
  extra: string
  dispatch: (a: Action) => void
}

let Component: React.SFC<ComponentProps> = ({ otherProp, count, fruit, extra, dispatch }) => {
  return (
    <div>
      <p id="other">{otherProp}</p>
      <p id="state">
        We have {count} {fruit} {extra}
      </p>
      <button
        id="number-button"
        onClick={() =>
          dispatch({
            type: ActionType.SET_COUNT,
            payload: 6
          })
        }
      >
        Set the number of things to 6
      </button>
      <button
        id="string-button"
        onClick={() =>
          dispatch({
            type: ActionType.SET_FRUIT,
            payload: 'apples'
          })
        }
      >
        Set the thing to be apples
      </button>
    </div>
  )
}

describe('viewModelFromReducer', () => {
  let rendered: ReactWrapper<any, any>

  beforeEach(() => {
    let ComponentWithViewModel = withViewModel(viewModel, Component)
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
