import { Subject, Observable, merge } from 'rxjs'
import { ViewModel, SubjectMap, ObservableMap } from '@rxreact/core'
import {
  startWith,
  scan,
  tap,
  filter,
  map,
  withLatestFrom,
  distinctUntilChanged,
  shareReplay
} from 'rxjs/operators'

export type Reducer<S, P> = (state: S, payload: P) => S

export type Reducers<S, A> = { [K in keyof A]: Reducer<S, A[K]> }

export type ReductionMap<S, A> = { [K in keyof A]: Observable<S> }

export type Selector<S, P> = (state: S) => P

export type Selectors<S, O> = { [K in keyof O]: Selector<S, O[K]> }

export interface ViewModelWithState<S, A, O> {
  initialState: S
  reducers: Reducers<S, A>
  selectors: Selectors<S, O>
}
export const assoc = <S, P extends keyof S>(k: P, v: S[P], existing: S): S => {
  return Object.assign({}, existing, { [k]: v })
}

export function transformValues<T>(transform: (x: keyof T) => T[keyof T], list: (keyof T)[]): T
export function transformValues<T, U>(
  transform: (x: T[keyof T & keyof U], key: keyof T & keyof U) => U[keyof T & keyof U],
  list: T
): U
export function transformValues<T, U>(
  transform: (x: T[keyof T & keyof U], key: keyof T & keyof U) => U[keyof T & keyof U],
  list: T
): U {
  return Array.isArray(list)
    ? list.reduce<U>((acc, cur) => assoc(cur, transform(cur, cur), acc), {} as U)
    : ((Object.keys(list) as (keyof T & keyof U)[]).reduce<Partial<U>>(
        (acc, cur) => assoc(cur, transform(list[cur], cur), acc),
        {}
      ) as U)
}

export function viewModelWithState<S, A, O>(
  viewModelReducer: ViewModelWithState<S, A, O>
): ViewModel<O, A> {
  const { initialState, reducers, selectors } = viewModelReducer
  const actions = transformValues<Reducers<S, A>, SubjectMap<A>>(_ => new Subject(), reducers)
  const stateInput = new Subject<S>()
  const reductions = Object.values<Observable<S>>(
    transformValues<SubjectMap<A>, ReductionMap<S, A>>(
      (action, key) =>
        action.pipe(
          withLatestFrom(stateInput),
          map(([payload, state]) => {
            return reducers[key](state, payload)
          })
        ),
      actions
    )
  )
  const stateOutput = merge(...reductions).pipe(
    startWith(initialState),
    shareReplay(1)
  )
  stateOutput.subscribe(stateInput)
  const selections = transformValues<Selectors<S, O>, ObservableMap<O>>(
    selector =>
      stateOutput.pipe(
        map(selector),
        distinctUntilChanged()
      ),
    selectors
  )

  return {
    inputs: selections,
    outputs: actions
  }
}
