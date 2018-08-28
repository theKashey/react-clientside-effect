import React, {Component} from 'react';
import isNode from 'detect-node';
import shallowEqual from 'shallowequal';

let couldUseSideEffect = !isNode;
export const useNode = flag => couldUseSideEffect = !flag;

export default function withSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
) {
  if (typeof reducePropsToState !== 'function') {
    throw new Error('Expected reducePropsToState to be a function.');
  }
  if (typeof handleStateChangeOnClient !== 'function') {
    throw new Error('Expected handleStateChangeOnClient to be a function.');
  }

  function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
  }

  return function wrap(WrappedComponent) {
    if (typeof WrappedComponent !== 'function') {
      throw new Error('Expected WrappedComponent to be a React component.');
    }

    let mountedInstances = [];
    let state;

    function emitChange() {
      state = reducePropsToState(mountedInstances.map(function (instance) {
        return instance.props;
      }));

      handleStateChangeOnClient(state);
    }

    class SideEffect extends Component {
      // Try to use displayName of wrapped component
      static displayName = `SideEffect(${getDisplayName(WrappedComponent)})`;

      static peek() {
        return state;
      }

      static instances() {
        return mountedInstances;
      }

      shouldComponentUpdate(nextProps) {
        return !shallowEqual(nextProps, this.props);
      }

      componentWillMount() {
        if (couldUseSideEffect) {
          mountedInstances.push(this);
          emitChange();
        }
      }

      componentDidUpdate() {
        emitChange();
      }

      componentWillUnmount() {
        const index = mountedInstances.indexOf(this);
        if (index >= 0) {
          mountedInstances.splice(index, 1);
          emitChange();
        }
      }

      render() {
        return <WrappedComponent {...this.props} />;
      }
    }

    return SideEffect;
  }
}
