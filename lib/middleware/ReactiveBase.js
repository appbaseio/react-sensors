"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _ChannelManager = require("./ChannelManager");

var _ChannelManager2 = _interopRequireDefault(_ChannelManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Appbase = require("appbase-js");
var helper = require("./helper.js");

var ReactiveBase = function (_Component) {
	_inherits(ReactiveBase, _Component);

	function ReactiveBase(props, context) {
		_classCallCheck(this, ReactiveBase);

		var _this = _possibleConstructorReturn(this, (ReactiveBase.__proto__ || Object.getPrototypeOf(ReactiveBase)).call(this, props));

		_this.state = {};
		_this.type = _this.props.type ? _this.props.type : "*";
		_this.appbaseRef = new Appbase({
			url: "http://172.16.230.127:9200",
			appname: _this.props.app,
			credentials: _this.props.credentials,
			type: _this.type
		});
		return _this;
	}

	_createClass(ReactiveBase, [{
		key: "getChildContext",
		value: function getChildContext() {
			return {
				appbaseRef: this.appbaseRef,
				type: this.type,
				app: this.props.app
			};
		}
	}, {
		key: "render",
		value: function render() {
			return _react2.default.createElement(
				"section",
				{ className: "rbc-base col s12 col-xs-12 " + this.props.theme, style: { padding: 0 } },
				this.props.children
			);
		}
	}]);

	return ReactiveBase;
}(_react.Component);

exports.default = ReactiveBase;


ReactiveBase.propTypes = {
	app: _react2.default.PropTypes.string.isRequired,
	credentials: helper.reactiveBaseValidation,
	type: _react2.default.PropTypes.string,
	theme: _react2.default.PropTypes.string
};

// Default props value
ReactiveBase.defaultProps = {
	theme: "rbc-blue"
};

ReactiveBase.childContextTypes = {
	appbaseRef: _react2.default.PropTypes.any.isRequired,
	type: _react2.default.PropTypes.any.isRequired,
	app: _react2.default.PropTypes.any
};