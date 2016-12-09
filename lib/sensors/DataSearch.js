'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.DataSearch = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactSelect = require('react-select');

var _reactSelect2 = _interopRequireDefault(_reactSelect);

var _ChannelManager = require('../middleware/ChannelManager.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var helper = require('../middleware/helper.js');

var DataSearch = exports.DataSearch = function (_Component) {
	_inherits(DataSearch, _Component);

	function DataSearch(props, context) {
		_classCallCheck(this, DataSearch);

		var _this = _possibleConstructorReturn(this, (DataSearch.__proto__ || Object.getPrototypeOf(DataSearch)).call(this, props));

		_this.state = {
			items: [],
			currentValue: null,
			rawData: {
				hits: {
					hits: []
				}
			}
		};
		_this.type = 'match_phrase';
		_this.handleSearch = _this.handleSearch.bind(_this);
		_this.setValue = _this.setValue.bind(_this);
		_this.defaultSearchQuery = _this.defaultSearchQuery.bind(_this);
		_this.previousSelectedSensor = {};
		return _this;
	}
	// Get the items from Appbase when component is mounted


	_createClass(DataSearch, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.setQueryInfo();
			this.createChannel();
			$(".Select-input input").css({
				'height': '20px',
				'-webkit-transition': 'none',
				'-moz-transition': 'none',
				'-ms-transition': 'none',
				'-o-transition': 'none',
				'transition': 'none'
			});
		}
		// set the query type and input data

	}, {
		key: 'setQueryInfo',
		value: function setQueryInfo() {
			var obj = {
				key: this.props.sensorId,
				value: {
					queryType: this.type,
					inputData: this.props.appbaseField
				}
			};
			helper.selectedSensor.setSensorInfo(obj);
			var searchObj = {
				key: this.props.searchInputId,
				value: {
					queryType: 'multi_match',
					inputData: this.props.appbaseField
				}
			};
			helper.selectedSensor.setSensorInfo(searchObj);
		}
		// Create a channel which passes the depends and receive results whenever depends changes

	}, {
		key: 'createChannel',
		value: function createChannel() {
			var depends = this.props.depends ? this.props.depends : {};
			depends[this.props.searchInputId] = {
				operation: "must",
				defaultQuery: this.defaultSearchQuery
			};
			var channelObj = _ChannelManager.manager.create(this.context.appbaseConfig, depends);
			channelObj.emitter.addListener(channelObj.channelId, function (res) {
				var data = res.data;
				var rawData = void 0;
				if (res.method === 'stream') {
					rawData = this.state.rawData;
					rawData.hits.hits.push(res.data);
				} else if (res.method === 'historic') {
					rawData = data;
				}
				this.setState({
					rawData: rawData
				});
				this.setData(rawData);
			}.bind(this));
		}
		//default query

	}, {
		key: 'defaultSearchQuery',
		value: function defaultSearchQuery(value) {
			return {
				"match_phrase_prefix": _defineProperty({}, this.props.appbaseField, value)
			};
		}

		// set value to search

	}, {
		key: 'setValue',
		value: function setValue(value, callback) {
			var obj = {
				key: this.props.searchInputId,
				value: value
			};
			helper.selectedSensor.set(obj, true);
			this.callback = callback;
			if (!value) {
				this.callback(null, {
					options: []
				});
			}
		}

		// set data after get the result

	}, {
		key: 'setData',
		value: function setData(data) {
			var _this2 = this;

			var options = [];
			var searchField = 'hit._source.' + this.props.appbaseField;
			// Check if this is Geo search or field tag search
			if (this.props.isGeoSearch) {
				(function () {
					// If it is Geo, we return the location field
					var latField = 'hit._source.' + _this2.props.latField;
					var lonField = 'hit._source.' + _this2.props.lonField;
					data.hits.hits.map(function (hit) {
						var location = {
							lat: eval(latField),
							lon: eval(lonField)
						};
						options.push({ value: location, label: eval(searchField) });
					});
				})();
			} else {
				data.hits.hits.map(function (hit) {
					options.push({ value: eval(searchField), label: eval(searchField) });
				});
			}
			options = this.removeDuplicates(options, "label");
			if (this.callback) {
				this.callback(null, {
					options: options
				});
			}
		}
		// Search results often contain duplicate results, so display only unique values

	}, {
		key: 'removeDuplicates',
		value: function removeDuplicates(myArr, prop) {
			return myArr.filter(function (obj, pos, arr) {
				return arr.map(function (mapObj) {
					return mapObj[prop];
				}).indexOf(obj[prop]) === pos;
			});
		}
		// When user has selected a search value

	}, {
		key: 'handleSearch',
		value: function handleSearch(currentValue) {
			var value = currentValue ? currentValue.value : null;
			value = value === 'null' ? null : value;
			var obj = {
				key: this.props.sensorId,
				value: value
			};
			helper.selectedSensor.set(obj, true);
			this.setState({
				currentValue: value
			});
		}
	}, {
		key: 'render',
		value: function render() {
			return _react2.default.createElement(
				'div',
				{ className: 'ab-component ab-SearchComponent' },
				_react2.default.createElement(_reactSelect2.default.Async, _extends({
					className: 'ab-select-react',
					name: 'appbase-search',
					value: this.state.currentValue,
					loadOptions: this.setValue,
					onChange: this.handleSearch
				}, this.props))
			);
		}
	}]);

	return DataSearch;
}(_react.Component);

DataSearch.propTypes = {
	sensorId: _react2.default.PropTypes.string.isRequired,
	sensorInputId: _react2.default.PropTypes.string,
	appbaseField: _react2.default.PropTypes.string,
	title: _react2.default.PropTypes.string,
	placeholder: _react2.default.PropTypes.string,
	size: _react2.default.PropTypes.number
};
// Default props value
DataSearch.defaultProps = {
	placeholder: "Search...",
	size: 10,
	executeDepends: true,
	sensorInputId: "searchLetter"
};

// context type
DataSearch.contextTypes = {
	appbaseConfig: _react2.default.PropTypes.any.isRequired
};