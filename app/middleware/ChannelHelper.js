const helper = require("./helper");

// queryBuild
// Builds the query by using react object and values of sensor
export const queryBuild = function(channelObj, previousSelectedSensor) {
	const sortObj = [];
	let requestOptions = null;

	// check if sortinfo is availbale
	function sortAvailable(depend) {
		const sortInfo = helper.selectedSensor.get(depend, "sortInfo");
		return sortInfo;
	}

	// build single query or if default query present in sensor itself use that
	function singleQuery(depend) {
		const sensorInfo = helper.selectedSensor.get(depend, "sensorInfo");
		let sQuery = null;
		if (sensorInfo && sensorInfo.customQuery) {
			sQuery = sensorInfo.customQuery(previousSelectedSensor[depend]);
		} else if (previousSelectedSensor[depend]) {
			sQuery = {};
			sQuery[sensorInfo.queryType] = {};
			if (sensorInfo.queryType !== "match_all") {
				sQuery[sensorInfo.queryType][sensorInfo.inputData] = previousSelectedSensor[depend];
			}
		}
		return sQuery;
	}

	function aggsQuery(depend) {
		const aggsObj = channelObj.react[depend];
		let order,
			type;
		if (aggsObj.sortRef) {
			const sortField = sortAvailable(aggsObj.sortRef);
			if (sortField && sortField.aggSort) {
				aggsObj.sort = sortField.aggSort;
			}
		}
		if (aggsObj.sort === "count") {
			order = "desc";
			type = "_count";
		} else if (aggsObj.sort === "asc") {
			order = "asc";
			type = "_term";
		} else {
			order = "desc";
			type = "_term";
		}
		const orderQuery = `{
				"${type}" : "${order}"
			}`;
		return JSON.parse(`{
				"${aggsObj.key}": {
					"terms": {
						"field": "${aggsObj.key}",
						"size": ${aggsObj.size},
						"order": ${orderQuery}
					}
				}
			}`);
	}

	function generateQuery() {
		const dependsQuery = {};
		channelObj.serializeDepends.dependsList.forEach((depend) => {
			if (depend === "aggs") {
				dependsQuery[depend] = aggsQuery(depend);
			} else if (depend && depend.indexOf("channel-options-") > -1) {
				requestOptions = previousSelectedSensor[depend];
			} else {
				dependsQuery[depend] = singleQuery(depend);
			}
			const sortField = sortAvailable(depend);
			if (sortField && !("aggSort" in sortField)) {
				sortObj.push(sortField);
			}
		});
		return dependsQuery;
	}

	function combineQuery(dependsQuery) {
		const query = helper.serializeDepends.createQuery(channelObj.serializeDepends, dependsQuery);
		if (query && query.body) {
			if (sortObj && sortObj.length) {
				query.body.sort = sortObj;
			}
			// apply request options
			if (requestOptions && Object.keys(requestOptions).length) {
				Object.keys(requestOptions).forEach((reqOption) => {
					query.body[reqOption] = requestOptions[reqOption];
				});
			}
		}
		return query;
	}

	function initialize() {
		const dependsQuery = generateQuery();
		const query = combineQuery(dependsQuery);
		return query;
	}

	return initialize();
}