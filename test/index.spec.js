require('jsdom-global/register');
const { expect } = require('chai');
const React = require('react');
const jsdom = require('jsdom');
const { mount } = require('enzyme')
const { renderToStaticMarkup } = require('react-dom/server')
const { render } = require('react-dom')

const withSideEffect = require('../src');

function noop() { }
const identity = x => x

describe('react-side-effect', () => {
  describe('argument validation', () => {
    it('should throw if no reducePropsState function is provided', () => {
      expect(withSideEffect).to.throw('Expected reducePropsToState to be a function.');
    });

    it('should throw if no handleStateChangeOnClient function is provided', () => {
      expect(withSideEffect.bind(null, noop)).to.throw('Expected handleStateChangeOnClient to be a function.');
    });

    it('should throw if no WrappedComponent is provided', () => {
      expect(withSideEffect(noop, noop)).to.throw('Expected WrappedComponent to be a React component');
    });
  });

  describe('displayName', () => {
    const withNoopSideEffect = withSideEffect(noop, noop);

    it('should wrap the displayName of wrapped createClass component', () => {
      const DummyComponent = React.createClass({displayName: 'Dummy', render: noop});
      const SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).to.equal('SideEffect(Dummy)');
    });

    it('should wrap the displayName of wrapped ES2015 class component', () => {
      class DummyComponent extends React.Component {
        static displayName = 'Dummy'
        render() {}
      }
      const SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).to.equal('SideEffect(Dummy)');
    });

    it('should use the constructor name of the wrapped functional component', () => {
      function DummyComponent() {}

      const SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).to.equal('SideEffect(DummyComponent)');
    });

    it('should fallback to "Component"', () => {
      const DummyComponent = React.createClass({displayName: null, render: noop});
      const SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).to.equal('SideEffect(Component)');
    });
  });

  describe('SideEffect component', () => {
    class DummyComponent extends React.Component {
      render () {
        return <div>hello {this.props.foo}</div>
      }
    };

    const withIdentitySideEffect = withSideEffect(identity, noop);
    let SideEffect;

    beforeEach(() => {
      SideEffect = withIdentitySideEffect(DummyComponent);
    });

    describe('peek', () => {
      it('should return the current state', () => {
        mount(<SideEffect foo="bar"/>);
        expect(SideEffect.peek()).to.deep.equal([{foo: 'bar'}]);
      });

      it('should NOT reset the state', () => {
        mount(<SideEffect foo="bar"/>);

        SideEffect.peek();
        const state = SideEffect.peek();

        expect(state).to.deep.equal([{foo: 'bar'}]);
      });
    });

    describe('handleStateChangeOnClient', () => {
      it('should execute handleStateChangeOnClient', () => {
        let sideEffectCollectedData;

        const handleStateChangeOnClient = state => (sideEffectCollectedData = state)

        SideEffect = withSideEffect(identity, handleStateChangeOnClient)(DummyComponent);

        SideEffect.canUseDOM = true;

        mount(<SideEffect foo="bar"/>);

        expect(sideEffectCollectedData).to.deep.equal([{foo: 'bar'}]);
      });
    });

    it('should collect props from all instances', () => {
      mount(<SideEffect foo="bar"/>);
      mount(<SideEffect something="different"/>);

      const state = SideEffect.peek();

      expect(state).to.deep.equal([{foo: 'bar'}, {something: 'different'}]);
    });

    it('should render the wrapped component', () => {
      const markup = renderToStaticMarkup(<SideEffect foo="bar"/>);

      expect(markup).to.equal('<div>hello bar</div>');
    });

  });
});
