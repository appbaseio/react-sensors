import React, { Component } from 'react';
import { ReactiveBase, SingleDropdownList, ResultList } from '../app.js';
import { ResponsiveStory } from '../middleware/helper.js';
import { Img } from './Img.js';

require('./list.css');

export default class SingleDropdownListDefault extends Component {
	constructor(props) {
		super(props);
		this.onData = this.onData.bind(this);
		this.DEFAULT_IMAGE = 'http://www.avidog.com/wp-content/uploads/2015/01/BellaHead082712_11-50x65.jpg';
	}

	componentDidMount() {
		ResponsiveStory();
	}

	onData(res) {
		let result, combineData = res.currentData;
		if(res.mode === 'historic') {
			combineData = res.currentData.concat(res.newData);
		}
		if (combineData) {
			result = combineData.map((markerData, index) => {
				let marker = markerData._source;
				return this.itemMarkup(marker, markerData);
			});
		}
		return result;
	}

	itemMarkup(marker, markerData) {
		return (
			<a className="full_row single-record single_record_for_clone"
				href={marker.event ? marker.event.event_url : ''}
				target="_blank"
				key={markerData._id}>
				<div className="img-container">
					<Img key={markerData._id} src={marker.member ? marker.member.photo : this.DEFAULT_IMAGE} />
				</div>
				<div className="text-container full_row">
					<div className="text-head text-overflow full_row">
						<span className="text-head-info text-overflow">
							{marker.member ? marker.member.member_name : ''} is going to {marker.event ? marker.event.event_name : ''}
						</span>
						<span className="text-head-city">{marker.group ? marker.group.group_city : ''}</span>
					</div>
					<div className="text-description text-overflow full_row">
						<ul className="highlight_tags">
							{
								marker.group.group_topics.map(function(tag,i){
									return (<li key={i}>{tag.topic_name}</li>)
								})
							}
						</ul>
					</div>
				</div>
			</a>
		);
	}

	render() {
		return (
			<ReactiveBase
				appname="reactivemap_demo"
				username="y4pVxY2Ok"
				password="c92481e2-c07f-4473-8326-082919282c18"
			>
				<div className="row">
					<div className="col s6 col-xs-6">
						<SingleDropdownList
							componentId="CitySensor"
							appbaseField={this.props.mapping.city}
							title="SingleDropdownList"
							size={100}
							{...this.props}
						/>
					</div>

					<div className="col s6 col-xs-6">
						<ResultList
							componentId="SearchResult"
							appbaseField={this.props.mapping.topic}
							title="Results"
							sortBy="asc"
							from={0}
							size={20}
							onData={this.onData}
							actuate={{
								CitySensor: {"operation": "must"}
							}}
						/>
					</div>
				</div>
			</ReactiveBase>
		);
	}
}

SingleDropdownListDefault.defaultProps = {
	mapping: {
		city: 'group.group_city.raw',
		topic: 'group.group_topics.topic_name_raw'
	}
};
