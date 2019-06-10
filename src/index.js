import React, {PureComponent} from 'react';

export default function withSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
) {
  if (process.env.NODE_ENV !== "production") {
    if (typeof reducePropsToState !== 'function') {
      throw new Error('Expected reducePropsToState to be a function.');
    }
    if (typeof handleStateChangeOnClient !== 'function') {
      throw new Error('Expected handleStateChangeOnClient to be a function.');
    }
  }

  function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
  }

  return function wrap(WrappedComponent) {
    if (process.env.NODE_ENV !== "production") {
      if (typeof WrappedComponent !== 'function') {
        throw new Error('Expected WrappedComponent to be a React component.');
      }
    }

    let mountedInstances = [];
    let state;

    function emitChange() {
      state = reducePropsToState(mountedInstances.map(function (instance) {
        return instance.props;
      }));

      handleStateChangeOnClient(state);
    }

    class SideEffect extends PureComponent {
      // Try to use displayName of wrapped component
      static displayName = `SideEffect(${getDisplayName(WrappedComponent)})`;

      static peek() {
        return state;
      }

      componentDidMount() {
        mountedInstances.push(this);
        emitChange();
      }

      componentDidUpdate() {
        emitChange();
      }

      componentWillUnmount() {
        const index = mountedInstances.indexOf(this);
        mountedInstances.splice(index, 1);
        emitChange();
      }

      render() {
        return <WrappedComponent {...this.props} />;
      }
    }

    return SideEffect;
  }
}
