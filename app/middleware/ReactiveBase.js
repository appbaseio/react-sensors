import React, { Component } from "react";
import manager from "./ChannelManager";
const Appbase = require("appbase-js");
const helper = require("./helper.js");

export default class ReactiveBase extends Component {
	constructor(props, context) {
		super(props);
		this.state = {};
		this.type = this.props.type ? this.props.type : "*";
		this.appbaseRef = new Appbase({
			url: this.props.url,
			appname: this.props.app,
			credentials: this.props.credentials,
			type: this.type
		});
	}

	getChildContext() {
		return {
			appbaseRef: this.appbaseRef,
			type: this.type,
			app: this.props.app
		};
	}

	render() {
		return (
			<section className={`rbc-base col s12 col-xs-12 ${this.props.theme}`} style={{ padding: 0 }}>
				{this.props.children}
			</section>
		);
	}
}

ReactiveBase.propTypes = {
	app: React.PropTypes.string.isRequired,
	credentials: helper.reactiveBaseValidation,
	type: React.PropTypes.string,
	theme: React.PropTypes.string
};

// Default props value
ReactiveBase.defaultProps = {
	theme: "rbc-blue"
};

ReactiveBase.childContextTypes = {
	appbaseRef: React.PropTypes.any.isRequired,
	type: React.PropTypes.any.isRequired,
	app: React.PropTypes.any
};
