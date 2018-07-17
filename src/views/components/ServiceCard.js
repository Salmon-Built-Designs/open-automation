import React from 'react';
import PropTypes from 'prop-types';
import CameraCard from './CameraCard.js';

export const ServiceCard = (props) => {
	switch (props.service.type) {
		case 'camera':
			return <CameraCard camera={props.service} parentPath={props.parentPath} />;
		default:
			return null;
	}
};

ServiceCard.propTypes = {
	service: PropTypes.object,
	parentPath: PropTypes.string
};

export default ServiceCard;
