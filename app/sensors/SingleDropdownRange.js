import { default as React, Component } from 'react';
import Select from 'react-select';
import { manager } from '../middleware/ChannelManager.js';
var helper = require('../middleware/helper.js');

export class SingleDropdownRange extends Component {
	constructor(props, context) {
		super(props);
		this.state = {
			selected: null
		};
		this.type = 'range';
		this.handleChange = this.handleChange.bind(this);
		this.defaultQuery = this.defaultQuery.bind(this);
	}

	// Set query information
	componentDidMount() {
		this.setQueryInfo();
		if(this.props.defaultSelected) {
			let records = this.props.data.filter((record) => {
				return record.label === this.props.defaultSelected;
			});
			if(records && records.length) {
				this.handleChange(records[0]);
			}
		}
	}

	// set the query type and input data
	setQueryInfo() {
		let obj = {
			key: this.props.sensorId,
			value: {
				queryType: this.type,
				inputData: this.props.appbaseField,
				defaultQuery: this.defaultQuery
			}
		};
		helper.selectedSensor.setSensorInfo(obj);
	}

	// build query for this sensor only
	defaultQuery(record) {
		if(record) {
			return {
				range: {
						[this.props.appbaseField]: {
						gte: record.start,
						lte: record.end,
						boost: 2.0
					}
				}
			};
		}
	}

	// use this only if want to create actuators
	// Create a channel which passes the depends and receive results whenever depends changes
	createChannel() {
		let depends = this.props.depends ? this.props.depends : {};
		var channelObj = manager.create(this.context.appbaseConfig, depends);
	}

	// handle the input change and pass the value inside sensor info
	handleChange(record) {
		this.setState({
			'selected': record
		});
		var obj = {
			key: this.props.sensorId,
			value: record
		};
		// pass the selected sensor value with sensorId as key,
		let isExecuteQuery = true;
		helper.selectedSensor.set(obj, isExecuteQuery);
	}

	// render
	render() {
		let title, titleExists;
		if(this.props.title) {
			titleExists = true;
			title = (<h4 className="ab-componentTitle col s12 col-xs-12">{this.props.title}</h4>);
		}
		return (
			<div className={"ab-component ab-ButtonGroupComponent col s12 col-xs-12 card thumbnail"} style={this.props.defaultStyle}>
				<div className="row">
					{title}
					<div className="col s12 col-xs-12">
						<Select
							options={this.props.data}
							clearable={false}
							value={this.state.selected}
							onChange={this.handleChange}
							placeholder={this.props.placeholder}
							searchable={false} />
					</div>
				</div>
			</div>
		);
	}
}

SingleDropdownRange.propTypes = {
	sensorId: React.PropTypes.string.isRequired,
	appbaseField: React.PropTypes.string.isRequired,
	placeholder: React.PropTypes.string,
	data: React.PropTypes.any.isRequired,
	defaultSelected: React.PropTypes.string
};
// Default props value
SingleDropdownRange.defaultProps = {
	placeholder: "Search...",
	size: 10
};

// context type
SingleDropdownRange.contextTypes = {
	appbaseConfig: React.PropTypes.any.isRequired
};