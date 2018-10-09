import { Subject, Observable, merge } from 'rxjs'
import { ViewModel } from '@rxreact/core'
import { startWith, scan, tap, filter, map } from 'rxjs/operators'

export enum ReducerResultStatus {
  NoUpdate,
  Update,
  SideEffects,
  UpdateWithSideEffects
}

export interface ReducerResultNoUpdate {
  type: ReducerResultStatus.NoUpdate
}

export interface ReducerResultUpdate<S> {
  type: ReducerResultStatus.Update
  state: S
}

export interface ReducerResultSideEffects<SideEffects extends string> {
  type: ReducerResultStatus.SideEffects
  sideEffects: SideEffects[]
}

export interface ReducerResultUpdateWithSideEffects<S, SideEffects extends string> {
  type: ReducerResultStatus.UpdateWithSideEffects
  state: S
  sideEffects: SideEffects[]
}

export type ReducerResultType<S, SideEffects extends string> =
  | ReducerResultNoUpdate
  | ReducerResultUpdate<S>
  | ReducerResultSideEffects<SideEffects>
  | ReducerResultUpdateWithSideEffects<S, SideEffects>

export type Reducer<S, A, SideEffects extends string> = (
  state: S,
  action: A
) => ReducerResultType<S, SideEffects>

export type SideEffectsObject<S, SideEffects extends string> = { [K in SideEffects]: Subject<S> }

interface WrappedState<S, SideEffects extends string> {
  type: ReducerResultStatus
  state: S
  sideEffects: SideEffects[]
}

export interface ViewModelReducer<S, A, SideEffects extends string> {
  initialState: S
  inputs?: Observable<A>
  reducer: Reducer<S, A, SideEffects>
  sideEffects: SideEffectsObject<S, SideEffects>
}

export type DispatchActions<A> = {
  dispatch: A
}

export const ReducerResult = {
  NoUpdate: (): ReducerResultNoUpdate => ({ type: ReducerResultStatus.NoUpdate }),
  SideEffects: <SideEffects extends string>(
    sideEffects: SideEffects[]
  ): ReducerResultSideEffects<SideEffects> => ({
    type: ReducerResultStatus.SideEffects,
    sideEffects
  }),
  Update: <State>(state: State): ReducerResultUpdate<State> => ({
    type: ReducerResultStatus.Update,
    state
  }),
  UpdateWithSideEffects: <State, SideEffects extends string>(
    state: State,
    sideEffects: SideEffects[]
  ): ReducerResultUpdateWithSideEffects<State, SideEffects> => ({
    type: ReducerResultStatus.UpdateWithSideEffects,
    state,
    sideEffects
  })
}
export function viewModelFromReducer<S, A, SideEffects extends string>(
  viewModelReducer: ViewModelReducer<S, A, SideEffects>
): ViewModel<S, DispatchActions<A>> {
  const { initialState, reducer } = viewModelReducer
  const dispatch: Subject<A> = new Subject()
  const actions = viewModelReducer.inputs ? merge(dispatch, viewModelReducer.inputs) : dispatch
  const state: Observable<S> = actions.pipe(
    scan<A, WrappedState<S, SideEffects>>(
      (wrappedState, action) => {
        const reducerResult = reducer(wrappedState.state, action)
        const state =
          reducerResult.type === ReducerResultStatus.Update ||
          reducerResult.type === ReducerResultStatus.UpdateWithSideEffects
            ? reducerResult.state
            : wrappedState.state
        const sideEffects =
          reducerResult.type === ReducerResultStatus.SideEffects ||
          reducerResult.type === ReducerResultStatus.UpdateWithSideEffects
            ? reducerResult.sideEffects
            : []
        return { type: reducerResult.type, state, sideEffects }
      },
      {
        type: ReducerResultStatus.Update,
        state: viewModelReducer.initialState,
        sideEffects: []
      }
    ),
    tap(wrappedState => {
      if ([ReducerResultStatus.NoUpdate, ReducerResultStatus.Update].includes(wrappedState.type)) {
        return
      }
      wrappedState.sideEffects.forEach(sideEffect =>
        viewModelReducer.sideEffects[sideEffect].next(wrappedState.state)
      )
    }),
    filter(wrappedState =>
      [ReducerResultStatus.Update, ReducerResultStatus.UpdateWithSideEffects].includes(
        wrappedState.type
      )
    ),
    map(wrappedState => wrappedState.state),
    startWith(initialState)
  )

  return {
    inputs: state,
    outputs: { dispatch }
  }
}
