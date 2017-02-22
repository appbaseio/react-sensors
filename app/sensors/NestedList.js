import React, { Component } from 'react';
import classNames from 'classnames';
import { manager } from '../middleware/ChannelManager.js';
import { StaticSearch } from '../addons/StaticSearch.js';
import InitialLoader from '../addons/InitialLoader';
var helper = require('../middleware/helper.js');
var _ = require('lodash');
import * as TYPES from '../middleware/constants.js';

export default class NestedList extends Component {
	constructor(props, context) {
		super(props);
		this.state = {
			items: [],
			storedItems: [],
			rawData: {
				hits: {
					hits: []
				}
			},
			subItems: [],
			selectedValues: []
		};
		this.nested = [
			'nestedParentaggs',
			'nestedChildaggs'
		];
		this.sortObj = {
			aggSort: this.props.sortBy
		};
		this.channelId = null;
		this.channelListener = null;
		this.defaultSelected = this.props.defaultSelected;
		this.filterBySearch = this.filterBySearch.bind(this);
		this.onItemSelect = this.onItemSelect.bind(this);
		this.customQuery = this.customQuery.bind(this);
		this.handleSelect = this.handleSelect.bind(this);
		this.type = 'Term';
	}

	// Get the items from Appbase when component is mounted
	componentWillMount() {
		this.setQueryInfo();
		this.createChannel();
		this.createSubChannel();
	}

	componentDidMount() {
		if (this.props.defaultSelected) {
			this.defaultSelected = this.props.defaultSelected;
			setTimeout(this.handleSelect.bind(this), 100);
		}
	}

	handleSelect() {
		if (this.props.defaultSelected) {
			this.props.defaultSelected.forEach((value, index) => {
				this.onItemSelect(value, index);
			})
		}
	}

	componentWillUpdate() {
		setTimeout(() => {
			if (!_.isEqual(this.defaultSelected, this.props.defaultSelected)) {
				this.defaultSelected = this.props.defaultSelected;
				let items = this.state.items;
				items = items.map((item) => {
					item.key = item.key.toString();
					item.status = this.defaultSelected.length && this.defaultSelected.indexOf(item.key) > -1 ? true : false;
					return item;
				});
				this.setState({
					items: items,
					storedItems: items
				});
				this.handleSelect(this.defaultSelected);
			}
			if (this.sortBy != this.props.sortBy) {
				this.sortBy = this.props.sortBy;
				this.handleSortSelect();
			}
		}, 300);
	}

	// stop streaming request and remove listener when component will unmount
	componentWillUnmount() {
		if (this.channelId) {
			manager.stopStream(this.channelId);
		}
		if (this.subChannelId) {
			manager.stopStream(this.subChannelId);
		}
		if (this.channelListener) {
			this.channelListener.remove();
		}
		if (this.subChannelListener) {
			this.subChannelListener.remove();
		}
		if (this.loadListenerParent) {
			this.loadListenerParent.remove();
		}
		if (this.loadListenerChild) {
			this.loadListenerChild.remove();
		}
	}

	// build query for this sensor only
	customQuery(record) {
		if (record) {
			let query = {
				bool: {
					must: generateRangeQuery(this.props.appbaseField)
				}
			};
			return query;
		}

		function generateRangeQuery(appbaseField) {
			return record.map((singleRecord, index) => {
				return {
					term: {
						[appbaseField[index]]: singleRecord
					}
				};
			});
		}
	}

	// set the query type and input data
	setQueryInfo() {
		var obj = {
			key: this.props.componentId,
			value: {
				queryType: this.type,
				inputData: this.props.appbaseField[0],
				customQuery: this.props.customQuery ? this.props.customQuery : this.customQuery
			}
		};
		helper.selectedSensor.setSensorInfo(obj);
	}

	includeAggQuery() {
		this.nested.forEach((name) => {
			var obj = {
				key: name,
				value: this.sortObj
			};
			helper.selectedSensor.setSortInfo(obj);
		});
	}

	handleSortSelect() {
		this.sortObj = {
			aggSort: this.props.sortBy
		};
		this.nested.forEach((name) => {
			let obj = {
				key: name,
				value: this.sortObj
			};
			helper.selectedSensor.set(obj, true, 'sortChange');
		});
	}

	// Create a channel which passes the react and receive results whenever react changes
	createChannel() {
		// Set the react - add self aggs query as well with react
		let react = this.props.react ? this.props.react : {};
		react['aggs'] = {
			key: this.props.appbaseField[0],
			sort: this.props.sortBy,
			size: this.props.size,
			sortRef: this.nested[0]
		};
		if (react && react.and && typeof react.and === 'string') {
			react.and = [react.and];
		} else {
			react.and = react.and ? react.and : [];
		}
		react.and.push(this.nested[0]);
		this.includeAggQuery();

		// create a channel and listen the changes
		var channelObj = manager.create(this.context.appbaseRef, this.context.type, react);
		this.channelId = channelObj.channelId;
		this.channelListener = channelObj.emitter.addListener(this.channelId, function(res) {
			if (res.error) {
				this.setState({
					queryStart: false
				});
			}
			if (res.appliedQuery) {
				let data = res.data;
				let rawData;
				if (res.mode === 'streaming') {
					rawData = this.state.rawData;
					rawData.hits.hits.push(res.data);
				} else if (res.mode === 'historic') {
					rawData = data;
				}
				this.setState({
					queryStart: false,
					rawData: rawData
				});
				this.setData(rawData, 0);
			}
		}.bind(this));
		this.listenLoadingChannel(channelObj, 'loadListenerParent');
	}

	listenLoadingChannel(channelObj, listener) {
		this[listener] = channelObj.emitter.addListener(channelObj.channelId + '-query', function(res) {
			if (res.appliedQuery) {
				this.setState({
					queryStart: res.queryState
				});
			}
		}.bind(this));
	}

	// Create a channel for sub category
	createSubChannel() {
		this.setSubCategory();
		let react = {
			'aggs': {
				key: this.props.appbaseField[1],
				sort: this.props.sortBy,
				size: this.props.size,
				sortRef: this.nested[1]
			},
			'and': ['subCategory', this.nested[1]]
		};
		// create a channel and listen the changes
		var subChannelObj = manager.create(this.context.appbaseRef, this.context.type, react);
		this.subChannelId = subChannelObj.channelId;
		this.subChannelListener = subChannelObj.emitter.addListener(this.subChannelId, function(res) {
			if (res.error) {
				this.setState({
					queryStart: false
				});
			}
			if (res.appliedQuery) {
				let data = res.data;
				let rawData;
				if (res.mode === 'streaming') {
					rawData = this.state.subRawData;
					rawData.hits.hits.push(res.data);
				} else if (res.mode === 'historic') {
					rawData = data;
				}
				if (this.state.selectedValues.length) {
					this.setState({
						queryStart: false,
						subRawData: rawData
					});
					this.setData(rawData, 1);
				}
			}
		}.bind(this));
		this.listenLoadingChannel(subChannelObj, 'loadListenerChild');
		var obj = {
			key: 'subCategory',
			value: ''
		};
		helper.selectedSensor.set(obj, true);
	}

	// set the query type and input data
	setSubCategory() {
		var obj = {
			key: 'subCategory',
			value: {
				queryType: 'term',
				inputData: this.props.appbaseField[0]
			}
		};

		helper.selectedSensor.setSensorInfo(obj);
	}

	setData(data, level) {
		if (data && data.aggregations && data.aggregations[this.props.appbaseField[level]] && data.aggregations[this.props.appbaseField[level]].buckets) {
			this.addItemsToList(data.aggregations[this.props.appbaseField[level]].buckets, level);
		}
	}

	addItemsToList(newItems, level) {
		newItems = newItems.map((item) => {
			item.key = item.key.toString();
			item.status = this.defaultSelected && this.defaultSelected.indexOf(item.key) > -1 ? true : false;
			return item
		});
		let itemVar = level === 0 ? 'items' : 'subItems';
		this.setState({
			[itemVar]: newItems,
			storedItems: newItems
		});
	}

	// set value
	setValue(value, isExecuteQuery = false) {
		var obj = {
			key: this.props.componentId,
			value: value
		};
		helper.selectedSensor.set(obj, isExecuteQuery);
	}

	// filter
	filterBySearch(value) {
		if (value) {
			let items = this.state.storedItems.filter(function(item) {
				return item.key && item.key.toLowerCase().indexOf(value.toLowerCase()) > -1;
			});
			this.setState({
				items: items
			});
		} else {
			this.setState({
				items: this.state.storedItems
			});
		}
	}

	onItemSelect(key, level) {
		let selectedValues = this.state.selectedValues;
		let stateItems = {};
		if (selectedValues[level] == key) {
			delete selectedValues[level];
			stateItems = {
				selectedValues: selectedValues
			};
		} else {
			selectedValues[level] = key;
			stateItems = {
				selectedValues: selectedValues
			};
			if (level === 0) {
				selectedValues.splice(1, 1);
				if (key !== selectedValues[0]) {
					stateItems.subItems = [];
				}
				var obj = {
					key: 'subCategory',
					value: key
				};
				helper.selectedSensor.set(obj, true);
			}
		}
		this.setValue(selectedValues, true);
		this.setState(stateItems);
	}

	renderChevron(level) {
		return level === 0 ? (<i className="fa fa-chevron-right"></i>) : '';
	}

	countRender(doc_count) {
		var count;
		if (this.props.showCount) {
			count = (<span className="rbc-count"> {doc_count}</span>);
		}
		return count;
	}

	renderItems(items, level) {
		return items.map((item, index) => {
			let cx = classNames({
				'rbc-item-active': (item.key === this.state.selectedValues[level]),
				'rbc-item-inactive': !(item.key === this.state.selectedValues[level])
			});
			return (
				<li
					key={index}
					className="rbc-list-container col s12 col-xs-12">
					<a href="javascript:void(0);" className={`rbc-list-item ${cx}`} onClick={() => this.onItemSelect(item.key, level)}>
						<span className="rbc-label">{item.key} {this.countRender(item.doc_count)}</span>
						{this.renderChevron(level)}
					</a>
					{this.renderList(item.key, level)}
				</li>
			);
		});
	}

	renderList(key, level) {
		let list;
		if (key === this.state.selectedValues[level] && level === 0) {
			list = (
				<ul className="rbc-sublist-container rbc-indent col s12 col-xs-12">
					{this.renderItems(this.state.subItems, 1)}
				</ul>
			)
		}
		return list;
	}

	render() {
		let listComponent,
			searchComponent = null,
			title = null;

		listComponent = (
			<ul className="row rbc-list-container">
				{this.renderItems(this.state.items, 0)}
			</ul>
		);

		// set static search
		if (this.props.showSearch) {
			searchComponent = <StaticSearch
				placeholder={this.props.placeholder}
				changeCallback={this.filterBySearch}
			/>
		}

		if (this.props.title) {
			title = (<h4 className="rbc-title col s12 col-xs-12">{this.props.title}</h4>);
		}

		let cx = classNames({
			'rbc-search-active': this.props.showSearch,
			'rbc-search-inactive': !this.props.showSearch,
			'rbc-title-active': this.props.title,
			'rbc-title-inactive': !this.props.title,
			'rbc-placeholder-active': this.props.placeholder,
			'rbc-placeholder-inactive': !this.props.placeholder,
			'rbc-count-active': this.props.showCount,
			'rbc-count-inactive': !this.props.showCount,
			"rbc-initialloader-active": this.props.initialLoader,
			"rbc-initialloader-inactive": !this.props.initialLoader
		});

		return (
			<div className="rbc rbc-nestedlist-container card thumbnail col s12 col-xs-12">
				<div className={`rbc rbc-nestedlist col s12 col-xs-12 ${cx}`}>
					{title}
					{searchComponent}
					{listComponent}
				</div>
				{this.props.initialLoader && this.state.queryStart ? (<InitialLoader defaultText={this.props.initialLoader}></InitialLoader>) : null}
			</div>
		);
	}
}

NestedList.propTypes = {
	componentId: React.PropTypes.string.isRequired,
	appbaseField: React.PropTypes.array.isRequired,
	title: React.PropTypes.string,
	showCount: React.PropTypes.bool,
	showSearch: React.PropTypes.bool,
	sortBy: React.PropTypes.oneOf(['count', 'asc', 'desc']),
	size: helper.sizeValidation,
	defaultSelected: React.PropTypes.array,
	customQuery: React.PropTypes.func,
	initialLoader: React.PropTypes.oneOfType([
		React.PropTypes.string,
		React.PropTypes.element
	]),
	customQuery: React.PropTypes.func,
	react: React.PropTypes.object
};

// Default props value
NestedList.defaultProps = {
	showCount: true,
	sortBy: 'count',
	size: 100,
	showSearch: false,
	title: null,
	placeholder: 'Search'
};

// context type
NestedList.contextTypes = {
	appbaseRef: React.PropTypes.any.isRequired,
	type: React.PropTypes.any.isRequired
};

NestedList.types = {
	componentId: TYPES.STRING,
	appbaseField: TYPES.ARRAY,
	title: TYPES.STRING,
	react: TYPES.OBJECT,
	size: TYPES.NUMBER,
	sortBy: TYPES.STRING,
	showCount: TYPES.BOOLEAN,
	showSearch: TYPES.BOOLEAN,
	defaultSelected: TYPES.ARRAY,
	customQuery: TYPES.FUNCTION,
	initialLoader: TYPES.OBJECT
};
