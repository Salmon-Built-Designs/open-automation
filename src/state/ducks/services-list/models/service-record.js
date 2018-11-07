import Immutable from 'immutable';

// The ServiceRecord defines the fields of services and their default values.
const ServiceRecord = (defaultValues = {}) => class extends Immutable.Record({
		id: null,
		type: null,
		device_id: null,
		error: null,
		settings_definitions: null,
		settings: null,
		state: null,
		logList: null,
		strings: null,
		...defaultValues
	}) {
		constructor (values) {
			super({
				...defaultValues,
				...values,
				settings_definitions: Immutable.OrderedMap(values.settings_definitions.map(([property, definition]) => {
					const hydratedDefinition = {...definition};

					if (definition.type === 'list-of') {
						hydratedDefinition.item_fields = Immutable.OrderedMap(hydratedDefinition.item_fields);
					}

					return [property, hydratedDefinition];
				})),
				settings: mapWithDefaults({
					...defaultValues.settings,
					name: values.settings.name || values.strings.friendly_type // Default name to the service type.
				}, values.settings),
				state: mapWithDefaults(defaultValues.state, values.state),
				strings: Immutable.Map(values.strings)
			});
		}

		set (key, value) {
			let _value;

			switch (key) {
				case 'settings':
				case 'state':
					_value = mapWithDefaults(defaultValues[key], value);
					break;
				case 'settings_definitions':
					_value = Immutable.OrderedMap(value);
					break;
				default:
					_value = value;
					break;
			}

			return super.set(key, _value || defaultValues[key]);
		}
	},
	mapWithDefaults = (defaults, values) => Immutable.Map({
		...defaults,
		...Immutable.Map.isMap(values) ? values.toObject() : values
	});

export default ServiceRecord;
