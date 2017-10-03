/* eslint max-lines: 0 */
import React, { Component } from "react";
import PropTypes from 'prop-types';
import classNames from "classnames";
import manager from "../middleware/ChannelManager";
import JsonPrint from "../addons/JsonPrint";
import PoweredBy from "../sensors/PoweredBy";
import InitialLoader from "../addons/InitialLoader";
import NoResults from "../addons/NoResults";
import ResultStats from "../addons/ResultStats";
import Pagination from "../addons/Pagination";
import * as TYPES from "../middleware/constants";
import _ from "lodash";

const helper = require("../middleware/helper");

export default class ReactiveList extends Component {
	constructor(props) {
		super(props);
		this.state = {
			markers: [],
			query: {},
			currentData: [],
			resultMarkup: [],
			isLoading: false,
			queryStart: false,
			resultStats: {
				resultFound: false,
				total: 0,
				took: 0
			},
			showPlaceholder: true,
			showInitialLoader: false,
			requestOnScroll: !this.props.pagination
		};
		if (this.props.sortOptions) {
			const obj = this.props.sortOptions[0];
			this.sortObj = {
				[obj.dataField]: {
					order: obj.sortBy
				}
			};
		} else if (this.props.sortBy) {
			this.sortObj = {
				[this.props.dataField]: {
					order: this.props.sortBy
				}
			};
		}
		this.resultSortKey = "ResultSort";
		this.channelId = null;
		this.channelListener = null;
		this.queryStartTime = 0;
		this.handleSortSelect = this.handleSortSelect.bind(this);
		this.nextPage = this.nextPage.bind(this);
		this.appliedQuery = {};
	}

	componentWillMount() {
		this.streamProp = this.props.stream;
		this.size = this.props.size;
		this.initialize();
	}

	componentWillUpdate() {
		if (this.streamProp !== this.props.stream) {
			this.streamProp = this.props.stream;
		}
		if (this.size !== this.props.size) {
			this.size = this.props.size;
			this.setState({
				currentData: []
			});
		}
		if (this.props.pagination && this.paginationAtVal !== this.props.paginationAt) {
			this.paginationAtVal = this.props.paginationAt;
			this.executePaginationUpdate();
		}
	}

	componentWillReceiveProps(nextProps) {
		if (!_.isEqual(this.props, nextProps)) {
			this.setReact(nextProps);
			let size = null,
				from = null;
			if (this.props.size !== nextProps.size || this.props.from != nextProps.from) {
				size = nextProps.size;
				from = nextProps.from;
			}
			manager.update(this.channelId, this.react, size, from, nextProps.stream);
		}
		if (nextProps.pagination !== this.pagination) {
			this.pagination = nextProps.pagination;
			this.setState({
				requestOnScroll: !nextProps.pagination
			});
		}
	}

	// check the height and set scroll if scroll not exists
	componentDidUpdate() {
		if (!this.state.showPlaceholder && !this.props.scrollOnTarget) {
			this.applyScroll();
		}
		// only display PoweredBy if the parent container's height is above 300
		if (this.listContainer.clientHeight > 300) {
			this.poweredByContainer.style.display = "block";
		} else {
			this.poweredByContainer.style.display = "none";
		}
	}

	// stop streaming request and remove listener when component will unmount
	componentWillUnmount() {
		this.removeChannel();
	}

	applyScroll() {
		const resultElement = this.listParentElement;
		const scrollElement = this.listChildElement;
		const padding = 45;

		const checkHeight = () => {
			const flag = resultElement.scrollHeight - padding > resultElement.clientHeight;
			const scrollFlag = scrollElement.scrollHeight > resultElement.clientHeight;
			if (!flag && !scrollFlag && scrollElement && !this.props.pagination) {
				const headerHeight = this.titleContainer.clientHeight + this.paginationAtTop.clientHeight + this.paginationAtBottom.clientHeight;
				const finalHeight = resultElement.clientHeight - 60 - headerHeight;
				if (finalHeight > 0) {
					scrollElement.style.height = `${scrollElement.clientHeight + 15}px`;
					scrollElement.style.paddingBottom = "20px";
				}
			}
		};

		if (resultElement && scrollElement) {
			scrollElement.style.height = "auto";
			scrollElement.style.paddingBottom = 0;
			setTimeout(checkHeight.bind(this), 1000);
		}
	}

	removeChannel() {
		if (this.channelId) {
			manager.stopStream(this.channelId);
			this.channelId = null;
		}
		if (this.channelListener) {
			this.channelListener.remove();
		}
		if (this.loadListener) {
			this.loadListener.remove();
		}
	}

	setReact(props) {
		// Set the react - add self aggs query as well with react
		const react = Object.assign({}, props.react);

		const reactAnd = ["streamChanges"];
		if (props.pagination) {
			reactAnd.push("paginationChanges");
			react.pagination = null;
		}
		if (this.sortObj) {
			this.enableSort(reactAnd);
		}

		this.react = helper.setupReact(react, reactAnd);
	}

	// Create a channel which passes the react and receive results whenever react changes
	createChannel(executeChannel = false) {
		// create a channel and listen the changes
		const channelObj = manager.create(this.context.appbaseRef, this.context.type, this.react, this.props.size, this.props.from, this.props.stream, this.props.componentId, this.context.appbaseCrdentials);
		this.channelId = channelObj.channelId;

		this.channelListener = channelObj.emitter.addListener(channelObj.channelId, (res) => {
			// implementation to prevent initialize query issue if old query response is late then the newer query
			// then we will consider the response of new query and prevent to apply changes for old query response.
			// if queryStartTime of channel response is greater than the previous one only then apply changes
			if (res.error && res.startTime > this.queryStartTime) {
				this.setState({
					queryStart: false,
					showPlaceholder: false
				});
				if (this.props.onAllData) {
					const modifiedData = helper.prepareResultData(res);
					this.props.onAllData(modifiedData.res, modifiedData.err);
				}
			}
			if (res.appliedQuery) {
				if (res.mode === "historic" && res.startTime > this.queryStartTime) {
					const visibleNoResults = res.appliedQuery && Object.keys(res.appliedQuery).length && res.data && !res.data.error ? (!(res.data.hits && res.data.hits.total)) : false;
					const resultStats = {
						resultFound: !!(res.appliedQuery && res.data && !res.data.error && res.data.hits && res.data.hits.total)
					};
					if (res.appliedQuery && res.data && !res.data.error) {
						resultStats.total = res.data.hits.total;
						resultStats.took = res.data.took;
					}
					this.setState({
						queryStart: false,
						visibleNoResults,
						resultStats,
						showPlaceholder: false
					});
					this.afterChannelResponse(res);
				} else if (res.mode === "streaming") {
					this.afterChannelResponse(res);
					this.updateResultStats(res.data);
				}
			} else {
				this.setState({
					showPlaceholder: true
				});
			}
		});
		this.listenLoadingChannel(channelObj);
		if (executeChannel) {
			setTimeout(() => {
				const obj = {
					key: "streamChanges",
					value: ""
				};
				helper.selectedSensor.set(obj, true);
			}, 100);
		}
	}

	updateResultStats(newData) {
		const resultStats = this.state.resultStats;
		resultStats.total = helper.updateStats(resultStats.total, newData);
		this.setState({
			resultStats
		});
	}

	listenLoadingChannel(channelObj) {
		this.loadListener = channelObj.emitter.addListener(`${channelObj.channelId}-query`, (res) => {
			if (res.appliedQuery) {
				const showInitialLoader = !(this.state.requestOnScroll && res.appliedQuery.body && res.appliedQuery.body.from);
				this.setState({
					queryStart: res.queryState,
					showInitialLoader
				});
			}
		});
	}

	afterChannelResponse(res) {
		const data = res.data;
		let rawData,
			markersData,
			newData = [],
			currentData = [];
		this.streamFlag = false;
		if (res.mode === "streaming") {
			this.channelMethod = "streaming";
			newData = data;
			newData.stream = true;
			currentData = this.state.currentData;
			this.streamFlag = true;
			markersData = this.setMarkersData(rawData);
		} else if (res.mode === "historic") {
			this.queryStartTime = res.startTime;
			this.channelMethod = "historic";
			newData = data.hits && data.hits.hits ? data.hits.hits : [];
			const normalizeCurrentData = this.normalizeCurrentData(res, this.state.currentData, newData);
			newData = normalizeCurrentData.newData;
			currentData = normalizeCurrentData.currentData;
		}
		this.setState({
			rawData,
			newData,
			currentData,
			markersData,
			isLoading: false
		}, () => {
			// Pass the historic or streaming data in index method
			res.allMarkers = rawData;
			let modifiedData = JSON.parse(JSON.stringify(res));
			modifiedData.newData = this.state.newData;
			modifiedData.currentData = this.state.currentData;
			delete modifiedData.data;
			modifiedData = helper.prepareResultData(modifiedData, data);
			const generatedData = this.props.onAllData ? this.props.onAllData(modifiedData.res, modifiedData.err) : this.defaultonAllData(modifiedData.res, modifiedData.err);
			this.setState({
				resultMarkup: generatedData,
				currentData: this.combineCurrentData(newData)
			});
		});
	}

	// normalize current data
	normalizeCurrentData(res, rawData, newData) {
		const appliedQuery = JSON.parse(JSON.stringify(res.appliedQuery));
		if (this.state.requestOnScroll && appliedQuery && appliedQuery.body) {
			delete appliedQuery.body.from;
			delete appliedQuery.body.size;
		}
		const isSameQuery = JSON.stringify(appliedQuery) === JSON.stringify(this.appliedQuery);
		const currentData = isSameQuery ? (rawData || []) : [];
		if (!currentData.length) {
			this.appliedQuery = appliedQuery;
		} else {
			newData = newData.filter((newRecord) => {
				let notExits = true;
				currentData.forEach((oldRecord) => {
					if (`${newRecord._id}-${newRecord._type}` === `${oldRecord._id}-${oldRecord._type}`) {
						notExits = false;
					}
				});
				return notExits;
			});
		}
		if (!isSameQuery) {
			this.listParentElement.scrollTop = 0;
		}
		return {
			currentData,
			newData
		};
	}

	combineCurrentData(newData) {
		if (Array.isArray(newData)) {
			newData = newData.map((item) => {
				item.stream = false;
				return item;
			});
			return this.state.currentData.concat(newData);
		}
		return this.streamDataModify(this.state.currentData, newData, false);
	}

	// enable sort
	enableSort(reactAnd) {
		reactAnd.push(this.resultSortKey);
		const sortObj = {
			key: this.resultSortKey,
			value: this.sortObj
		};
		helper.selectedSensor.setSortInfo(sortObj);
	}

	// append data if pagination is applied
	appendData(data) {
		const rawData = this.state.rawData;
		const hits = rawData.hits.hits.concat(data.hits.hits);
		rawData.hits.hits = _.uniqBy(hits, "_id");
		return rawData;
	}

	// append stream boolean flag and also start time of stream
	streamDataModify(rawData, data, streamFlag = true) {
		if (data) {
			data.stream = streamFlag;
			data.streamStart = new Date();
			if (data._deleted) {
				const hits = rawData.filter(hit => hit._id !== data._id);
				rawData = hits;
			} else {
				const hits = rawData.filter(hit => hit._id !== data._id);
				rawData = hits;
				rawData.unshift(data);
			}
		}
		return rawData;
	}

	// tranform the raw data to marker data
	setMarkersData(hits) {
		if (hits) {
			return hits;
		}
		return [];
	}

	initialize(executeChannel = false) {
		this.setReact(this.props);
		this.createChannel(executeChannel);
		if (this.state.requestOnScroll) {
			setTimeout(() => {
				this.listComponent();
			}, 100);
		} else {
			this.setQueryForPagination();
		}
	}

	setQueryForPagination() {
		const valObj = {
			queryType: "match",
			inputData: this.props.dataField,
			customQuery: () => null
		};
		const obj = {
			key: "paginationChanges",
			value: valObj
		};
		helper.selectedSensor.setSensorInfo(obj);
	}

	executePaginationUpdate() {
		setTimeout(() => {
			const obj = {
				key: "paginationChanges",
				value: Math.random()
			};
			helper.selectedSensor.set(obj, true);
		}, 100);
	}

	paginationAt(method) {
		return (
			<div className="rbc-pagination-container col s12 col-xs-12">
				<Pagination
					show={this.props.pagination && (this.props.paginationAt === method || this.props.paginationAt === "both")}
					className={`rbc-pagination-${method}`}
					componentId="pagination"
					onPageChange={this.props.onPageChange}
					title={this.props.paginationTitle}
					pages={this.props.pages}
					pageURLParams={this.props.pageURLParams}
				/>
			</div>
		);
	}

	defaultonAllData(res) {
		let result = null;
		if (res) {
			let combineData = res.currentData;
			if (res.mode === "historic") {
				combineData = res.currentData.concat(res.newData);
			} else if (res.mode === "streaming") {
				combineData = helper.combineStreamData(res.currentData, res.newData);
			}
			if (combineData) {
				result = combineData.map((markerData) => {
					const marker = markerData._source;
					return this.props.onData
						?	this.props.onData(markerData)
						: (
							<div className="row" style={{ marginTop: "20px" }}>
								{this.itemMarkup(marker, markerData)}
							</div>
					);
				});
			}
		}
		return result;
	}

	itemMarkup(marker, markerData) {
		return (
			<div
				key={markerData._id}
				style={{ padding: "12px", fontSize: "12px" }}
				className="makerInfo"
			>
				<JsonPrint data={marker} />
			</div>
		);
	}

	nextPage() {
		function start() {
			this.setState({
				isLoading: true
			});
			manager.nextPage(this.channelId);
		}

		if (this.state.resultStats.total > this.state.currentData.length && !this.state.queryStart) {
			start.call(this);
		}
	}

	listComponent() {
		function setScroll(node) {
			if (node) {
				node.addEventListener("scroll", () => {
					// since a window object has different properties, referencing document.body to get the complete page
					if (node === window) {
						node = node.document.body;
					}
					if (this.state.requestOnScroll && node.scrollTop + node.clientHeight >= node.scrollHeight && this.state.resultStats.total > this.state.currentData.length && !this.state.queryStart) {
						this.nextPage();
					}
				});
			}
		}
		if (this.props.scrollOnTarget) {
			setScroll.call(this, this.props.scrollOnTarget);
		} else {
			setScroll.call(this, this.listParentElement);
			setScroll.call(this, this.listChildElement);
		}
	}

	handleSortSelect(event) {
		const index = event.target.value;
		this.sortObj = {
			[this.props.sortOptions[index].dataField]: {
				order: this.props.sortOptions[index].sortBy
			}
		};
		const obj = {
			key: this.resultSortKey,
			value: this.sortObj
		};
		helper.selectedSensor.set(obj, true, "sortChange");
	}

	getComponentStyle() {
		let style = {};
		if (this.props.scrollOnTarget) {
			style.maxHeight = "none";
			style.height = "auto";
		}
		return style;
	}

	render() {
		let title = null,
			placeholder = null,
			sortOptions = null;
		const cx = classNames({
			"rbc-title-active": this.props.title,
			"rbc-title-inactive": !this.props.title,
			"rbc-sort-active": this.props.sortOptions,
			"rbc-sort-inactive": !this.props.sortOptions,
			"rbc-stream-active": this.props.stream,
			"rbc-stream-inactive": !this.props.stream,
			"rbc-placeholder-active": this.props.placeholder,
			"rbc-placeholder-inactive": !this.props.placeholder,
			"rbc-initialloader-active": this.props.initialLoader,
			"rbc-initialloader-inactive": !this.props.initialLoader,
			"rbc-resultstats-active": this.props.showResultStats,
			"rbc-resultstats-inactive": !this.props.showResultStats,
			"rbc-noresults-active": this.props.noResults,
			"rbc-noresults-inactive": !this.props.noResults,
			"rbc-pagination-active": this.props.pagination,
			"rbc-pagination-inactive": !this.props.pagination
		});

		if (this.props.title) {
			title = (<h4 className="rbc-title col s12 col-xs-12" ref={(node) => { this.titleContainer = node; }}>{this.props.title}</h4>);
		}
		if (this.props.placeholder) {
			placeholder = (<div className="rbc-placeholder col s12 col-xs-12">{this.props.placeholder}</div>);
		}

		if (this.props.sortOptions) {
			const options = this.props.sortOptions.map((item, index) => <option value={index} key={item.label}>{item.label}</option>);

			sortOptions = (
				<div className="rbc-sortoptions input-field col">
					<select className="browser-default form-control" onChange={this.handleSortSelect}>
						{options}
					</select>
				</div>
			);
		}

		return (
			<div className={`rbc-reactivelist-container ${this.props.className ? this.props.className : ""}`} ref={(node) => { this.listContainer = node; }} style={this.props.style}>
				<div ref={(div) => { this.listParentElement = div; }} className={`rbc rbc-reactivelist card thumbnail ${cx}`} style={this.getComponentStyle()}>
					{title}
					{sortOptions}
					{this.props.showResultStats && this.state.resultStats.resultFound ? (<ResultStats onResultStats={this.props.onResultStats} took={this.state.resultStats.took} total={this.state.resultStats.total} />) : null}
					<div ref={(node) => { this.paginationAtTop = node; }}>
						{this.paginationAt("top")}
					</div>
					<div ref={(div) => { this.listChildElement = div; }} className="rbc-reactivelist-scroll-container col s12 col-xs-12">
						{this.state.resultMarkup}
					</div>
					{
						this.state.isLoading ?
							<div className="rbc-loader" /> :
						null
					}
					{this.state.showPlaceholder ? placeholder : null}
					<div ref={(node) => { this.paginationAtBottom = node; }}>
						{this.paginationAt("bottom")}
					</div>
				</div>
				{this.props.noResults && this.state.visibleNoResults ? (<NoResults defaultText={this.props.noResults} />) : null}
				{this.props.initialLoader && this.state.queryStart && this.state.showInitialLoader ? (<InitialLoader defaultText={this.props.initialLoader} />) : null}
				<div ref={(node) => { this.poweredByContainer = node; }} style={{ display: "none" }}>
					<PoweredBy />
				</div>
			</div>
		);
	}
}

ReactiveList.propTypes = {
	componentId: PropTypes.string,
	dataField: PropTypes.string,
	title: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.element
	]),
	sortBy: PropTypes.oneOf(["asc", "desc", "default"]),
	sortOptions: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string,
			dataField: PropTypes.string,
			sortBy: PropTypes.string
		})
	),
	from: helper.validation.resultListFrom,
	onAllData: PropTypes.func,
	size: helper.sizeValidation,
	stream: PropTypes.bool,
	style: PropTypes.object,
	initialLoader: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.element
	]),
	noResults: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.element
	]),
	showResultStats: PropTypes.bool,
	onResultStats: PropTypes.func,
	placeholder: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.element
	]),
	react: PropTypes.object,
	paginationAt: PropTypes.string,
	pagination: PropTypes.bool,
	pages: PropTypes.number,
	scrollOnTarget: PropTypes.object,
	pageURLParams: PropTypes.bool,
	className: PropTypes.string
};

ReactiveList.defaultProps = {
	from: 0,
	size: 20,
	stream: false,
	style: {},
	showResultStats: true,
	pagination: true,
	paginationAt: "bottom",
	pages: 5,
	pageURLParams: false
};

// context type
ReactiveList.contextTypes = {
	appbaseRef: PropTypes.any.isRequired,
	type: PropTypes.any.isRequired,
	app: PropTypes.any.isRequired,
	appbaseCrdentials: PropTypes.any.isRequired
};

ReactiveList.types = {
	componentId: TYPES.STRING,
	dataField: TYPES.STRING,
	title: TYPES.STRING,
	react: TYPES.OBJECT,
	sortBy: TYPES.STRING,
	sortOptions: TYPES.OBJECT,
	from: TYPES.NUMBER,
	onAllData: TYPES.FUNCTION,
	onData: TYPES.FUNCTION,
	size: TYPES.NUMBER,
	stream: TYPES.BOOLEAN,
	style: TYPES.OBJECT,
	initialLoader: TYPES.STRING,
	noResults: TYPES.FUNCTION,
	showResultStats: TYPES.BOOLEAN,
	onResultStats: TYPES.FUNCTION,
	placeholder: TYPES.STRING,
	pagination: TYPES.BOOLEAN,
	paginationAt: TYPES.STRING,
	pages: TYPES.NUMBER,
	scrollOnTarget: TYPES.OBJECT,
	pageURLParams: TYPES.BOOLEAN,
	className: TYPES.STRING
};
