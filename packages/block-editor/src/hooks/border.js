/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { getBlockSupport } from '@wordpress/blocks';
import {
	__experimentalBorderBoxControl as BorderBoxControl,
	__experimentalHasSplitBorders as hasSplitBorders,
	__experimentalIsDefinedBorder as isDefinedBorder,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { Platform } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	BorderRadiusEdit,
	hasBorderRadiusValue,
	resetBorderRadius,
} from './border-radius';
import { getColorClassName } from '../components/colors';
import InspectorControls from '../components/inspector-controls';
import useMultipleOriginColorsAndGradients from '../components/colors-gradients/use-multiple-origin-colors-and-gradients';
import useSetting from '../components/use-setting';
import { cleanEmptyObject } from './utils';

export const BORDER_SUPPORT_KEY = '__experimentalBorder';

const borderSides = [ 'top', 'right', 'bottom', 'left' ];

const hasBorderValue = ( props ) => {
	const { borderColor, sideBorderColors, style } = props.attributes;
	return (
		isDefinedBorder( style?.border ) ||
		!! borderColor ||
		!! sideBorderColors
	);
};

// The border color, style, and width are omitted so they get undefined. The
// border radius is separate and must retain its selection.
const resetBorder = ( { attributes = {}, setAttributes } ) => {
	const { style } = attributes;
	setAttributes( {
		borderColor: undefined,
		sideBorderColors: undefined,
		style: {
			...style,
			border: cleanEmptyObject( {
				radius: style?.border?.radius,
			} ),
		},
	} );
};

const resetBorderFilter = ( newAttributes ) => ( {
	...newAttributes,
	borderColor: undefined,
	sideBorderColors: undefined,
	style: {
		...newAttributes.style,
		border: {
			radius: newAttributes.style?.border?.radius,
		},
	},
} );

const getColorByProperty = ( colors, property, value ) => {
	let matchedColor;

	colors.some( ( origin ) =>
		origin.colors.some( ( color ) => {
			if ( color[ property ] === value ) {
				matchedColor = color;
				return true;
			}

			return false;
		} )
	);

	return matchedColor;
};

export const getMultiOriginColor = ( { colors, namedColor, customColor } ) => {
	// Search each origin (default, theme, or user) for matching color by name.
	if ( namedColor ) {
		const colorObject = getColorByProperty( colors, 'slug', namedColor );
		if ( colorObject ) {
			return colorObject;
		}
	}

	// Skip if no custom color or matching named color.
	if ( ! customColor ) {
		return { color: undefined };
	}

	// Attempt to find color via custom color value or build new object.
	const colorObject = getColorByProperty( colors, 'color', customColor );
	return colorObject ? colorObject : { color: customColor };
};

const getBorderObject = ( attributes, colors ) => {
	const { borderColor, sideBorderColors, style } = attributes;
	const { border: borderStyles } = style || {};

	// If we have a named color for a flat border. Fetch that color object and
	// apply that color's value to the color property within the style object.
	if ( borderColor ) {
		const { color } = getMultiOriginColor( {
			colors,
			namedColor: borderColor,
		} );

		return color ? { ...borderStyles, color } : borderStyles;
	}

	// If we have named colors for the individual side borders, retrieve their
	// related color objects and apply the real color values to the split
	// border objects.
	if ( sideBorderColors ) {
		const hydratedBorderStyles = { ...borderStyles };

		Object.entries( sideBorderColors ).forEach(
			( [ side, namedColor ] ) => {
				const { color } = getMultiOriginColor( { colors, namedColor } );

				if ( color ) {
					hydratedBorderStyles[ side ] = {
						...hydratedBorderStyles[ side ],
						color,
					};
				}
			}
		);

		return hydratedBorderStyles;
	}

	// No named colors selected all color values if any should already be in
	// the style's border object.
	return borderStyles;
};

export function BorderPanel( props ) {
	const { attributes, clientId, setAttributes } = props;
	const { style } = attributes;
	const { colors } = useMultipleOriginColorsAndGradients();

	const isSupported = hasBorderSupport( props.name );
	const isColorSupported =
		useSetting( 'border.color' ) && hasBorderSupport( props.name, 'color' );
	const isRadiusSupported =
		useSetting( 'border.radius' ) &&
		hasBorderSupport( props.name, 'radius' );
	const isStyleSupported =
		useSetting( 'border.style' ) && hasBorderSupport( props.name, 'style' );
	const isWidthSupported =
		useSetting( 'border.width' ) && hasBorderSupport( props.name, 'width' );

	const isDisabled = [
		! isColorSupported,
		! isRadiusSupported,
		! isStyleSupported,
		! isWidthSupported,
	].every( Boolean );

	if ( isDisabled || ! isSupported ) {
		return null;
	}

	const defaultBorderControls = getBlockSupport( props.name, [
		BORDER_SUPPORT_KEY,
		'__experimentalDefaultControls',
	] );

	const showBorderByDefault =
		defaultBorderControls?.color || defaultBorderControls?.width;

	const onBorderChange = ( newBorder ) => {
		// Filter out named colors and apply them to appropriate block
		// attributes so that CSS classes can be used to apply those colors.
		// e.g. has-primary-border-top-color.

		let newBorderStyles = { ...newBorder };
		let newBorderColor;
		let newSideBorderColors;

		// Split borders will store their named colors within the
		// `sideBorderColors` block attribute.
		if ( hasSplitBorders( newBorder ) ) {
			// For each side check if the side has a color value set
			// If so, determine if it belongs to a named color, in which case
			// saved that named color to the block attribute and clear the
			// style object's color property to avoid the inline style.
			//
			// This deliberately overwrites `newBorderStyles` to avoid mutating
			// the passed object which causes problems otherwise.
			newBorderStyles = {
				top: { ...newBorder.top },
				right: { ...newBorder.right },
				bottom: { ...newBorder.bottom },
				left: { ...newBorder.left },
			};
			newSideBorderColors = {};

			borderSides.forEach( ( side ) => {
				if ( newBorder[ side ]?.color ) {
					const colorObject = getMultiOriginColor( {
						colors,
						customColor: newBorder[ side ]?.color,
					} );

					if ( colorObject.slug ) {
						// If we have a named color, set the sides named color
						// attribute and clear the saved style objects color value.
						newSideBorderColors[ side ] = colorObject.slug;
						newBorderStyles[ side ].color = undefined;
					}
				}
			} );
		} else if ( newBorder?.color ) {
			// We have a flat border configuration. Apply named color slug to
			// `borderColor` attribute and clear color style property if found.
			const customColor = newBorder?.color;
			const colorObject = getMultiOriginColor( { colors, customColor } );

			if ( colorObject.slug ) {
				newBorderColor = colorObject.slug;
				newBorderStyles.color = undefined;
			}
		}

		// Ensure previous border radius styles are maintained and clean
		// overall result for empty objects or properties.
		const newStyle = cleanEmptyObject( {
			...style,
			border: { radius: style?.border?.radius, ...newBorderStyles },
		} );

		setAttributes( {
			style: newStyle,
			borderColor: newBorderColor,
			sideBorderColors: newSideBorderColors,
		} );
	};

	const hydratedBorder = getBorderObject( attributes, colors );

	return (
		<InspectorControls __experimentalGroup="border">
			{ ( isWidthSupported || isColorSupported ) && (
				<ToolsPanelItem
					hasValue={ () => hasBorderValue( props ) }
					label={ __( 'Border' ) }
					onDeselect={ () => resetBorder( props ) }
					isShownByDefault={ showBorderByDefault }
					resetAllFilter={ resetBorderFilter }
					panelId={ clientId }
				>
					<BorderBoxControl
						colors={ colors }
						onChange={ onBorderChange }
						showStyle={ isStyleSupported }
						value={ hydratedBorder }
						__experimentalHasMultipleOrigins={ true }
						__experimentalIsRenderedInSidebar={ true }
					/>
				</ToolsPanelItem>
			) }
			{ isRadiusSupported && (
				<ToolsPanelItem
					hasValue={ () => hasBorderRadiusValue( props ) }
					label={ __( 'Radius' ) }
					onDeselect={ () => resetBorderRadius( props ) }
					isShownByDefault={ defaultBorderControls?.radius }
					resetAllFilter={ ( newAttributes ) => ( {
						...newAttributes,
						style: {
							...newAttributes.style,
							border: {
								...newAttributes.style?.border,
								radius: undefined,
							},
						},
					} ) }
					panelId={ clientId }
				>
					<BorderRadiusEdit { ...props } />
				</ToolsPanelItem>
			) }
		</InspectorControls>
	);
}

/**
 * Determine whether there is block support for border properties.
 *
 * @param {string} blockName Block name.
 * @param {string} feature   Border feature to check support for.
 *
 * @return {boolean} Whether there is support.
 */
export function hasBorderSupport( blockName, feature = 'any' ) {
	if ( Platform.OS !== 'web' ) {
		return false;
	}

	const support = getBlockSupport( blockName, BORDER_SUPPORT_KEY );

	if ( support === true ) {
		return true;
	}

	if ( feature === 'any' ) {
		return !! (
			support?.color ||
			support?.radius ||
			support?.width ||
			support?.style
		);
	}

	return !! support?.[ feature ];
}

/**
 * Check whether serialization of border classes and styles should be skipped.
 *
 * @param {string|Object} blockType Block name or block type object.
 *
 * @return {boolean} Whether serialization of border properties should occur.
 */
export function shouldSkipSerialization( blockType ) {
	const support = getBlockSupport( blockType, BORDER_SUPPORT_KEY );

	return support?.__experimentalSkipSerialization;
}

/**
 * Returns a new style object where the specified border attribute has been
 * removed.
 *
 * @param {Object} style     Styles from block attributes.
 * @param {string} attribute The border style attribute to clear.
 *
 * @return {Object} Style object with the specified attribute removed.
 */
export function removeBorderAttribute( style, attribute ) {
	return cleanEmptyObject( {
		...style,
		border: {
			...style?.border,
			[ attribute ]: undefined,
		},
	} );
}

/**
 * Filters registered block settings, extending attributes to include
 * `borderColor` if needed.
 *
 * @param {Object} settings Original block settings.
 *
 * @return {Object} Updated block settings.
 */
function addAttributes( settings ) {
	if ( ! hasBorderSupport( settings, 'color' ) ) {
		return settings;
	}

	// Allow blocks to specify border color values if needed.
	const { attributes } = settings;

	// Skip any adjustments if block already defines both border color
	// attributes to set defaults etc.
	if ( attributes.borderColor && attributes.sideBorderColors ) {
		return settings;
	}

	// If we are missing border color attribute definition, add it.
	if ( ! attributes.borderColor ) {
		return {
			...settings,
			attributes: {
				...attributes,
				borderColor: { type: 'string' },
			},
		};
	}

	// We are missing attribute for side border colors, add it to existing
	// attribute definitions.
	return {
		...settings,
		attributes: {
			...attributes,
			sideBorderColors: { type: 'object' },
		},
	};
}

/**
 * Override props assigned to save component to inject border color.
 *
 * @param {Object} props      Additional props applied to save element.
 * @param {Object} blockType  Block type definition.
 * @param {Object} attributes Block's attributes.
 *
 * @return {Object} Filtered props to apply to save element.
 */
function addSaveProps( props, blockType, attributes ) {
	if (
		! hasBorderSupport( blockType, 'color' ) ||
		shouldSkipSerialization( blockType )
	) {
		return props;
	}

	const borderClasses = getBorderClasses( attributes );
	const newClassName = classnames( props.className, borderClasses );

	// If we are clearing the last of the previous classes in `className`
	// set it to `undefined` to avoid rendering empty DOM attributes.
	props.className = newClassName ? newClassName : undefined;

	return props;
}

/**
 * Generates a CSS class name consisting of all the applicable border color
 * classes given the current block attributes.
 *
 * @param {Object} attributes Block's attributes.
 *
 * @return {string} CSS class name.
 */
export function getBorderClasses( attributes ) {
	const { borderColor, style } = attributes;
	const borderColorClass = getColorClassName( 'border-color', borderColor );

	return classnames( {
		'has-border-color': borderColor || style?.border?.color,
		[ borderColorClass ]: !! borderColorClass,
		...getSideBorderClasses( attributes ),
	} );
}

/**
 * Generates a collection of CSS classes for the block's current border color
 * selections. The results are intended to be further processed via a call
 * through `classnames()`.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object}           CSS classes for side border colors.
 */
function getSideBorderClasses( attributes ) {
	const { sideBorderColors, style } = attributes;

	return borderSides.reduce( ( classes, side ) => {
		const color = sideBorderColors?.[ side ];
		const hasColor = color || style?.border?.[ side ]?.color;
		const baseClassName = `border-${ side }-color`;
		const colorClass = getColorClassName( baseClassName, color );

		return {
			...classes,
			[ `has-${ baseClassName }` ]: hasColor,
			[ colorClass ]: !! colorClass,
		};
	}, {} );
}

/**
 * Filters the registered block settings to apply border color styles and
 * classnames to the block edit wrapper.
 *
 * @param {Object} settings Original block settings.
 *
 * @return {Object} Filtered block settings.
 */
function addEditProps( settings ) {
	if (
		! hasBorderSupport( settings, 'color' ) ||
		shouldSkipSerialization( settings )
	) {
		return settings;
	}

	const existingGetEditWrapperProps = settings.getEditWrapperProps;
	settings.getEditWrapperProps = ( attributes ) => {
		let props = {};

		if ( existingGetEditWrapperProps ) {
			props = existingGetEditWrapperProps( attributes );
		}

		return addSaveProps( props, settings, attributes );
	};

	return settings;
}

/**
 * This adds inline styles for color palette colors.
 * Ideally, this is not needed and themes should load their palettes on the editor.
 *
 * @param {Function} BlockListBlock Original component.
 *
 * @return {Function} Wrapped component.
 */
export const withBorderColorPaletteStyles = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const { name, attributes } = props;
		const { borderColor, sideBorderColors } = attributes;
		const { colors } = useMultipleOriginColorsAndGradients();

		if (
			! hasBorderSupport( name, 'color' ) ||
			shouldSkipSerialization( name )
		) {
			return <BlockListBlock { ...props } />;
		}

		const { color: borderColorValue } = getMultiOriginColor( {
			colors,
			namedColor: borderColor,
		} );
		const { color: borderTopColor } = getMultiOriginColor( {
			colors,
			namedColor: sideBorderColors?.top,
		} );
		const { color: borderRightColor } = getMultiOriginColor( {
			colors,
			namedColor: sideBorderColors?.right,
		} );
		const { color: borderBottomColor } = getMultiOriginColor( {
			colors,
			namedColor: sideBorderColors?.bottom,
		} );
		const { color: borderLeftColor } = getMultiOriginColor( {
			colors,
			namedColor: sideBorderColors?.left,
		} );

		const extraStyles = {
			borderTopColor: borderTopColor || borderColorValue,
			borderRightColor: borderRightColor || borderColorValue,
			borderBottomColor: borderBottomColor || borderColorValue,
			borderLeftColor: borderLeftColor || borderColorValue,
		};

		let wrapperProps = props.wrapperProps;
		wrapperProps = {
			...props.wrapperProps,
			style: {
				...extraStyles,
				...props.wrapperProps?.style,
			},
		};

		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}
);

addFilter(
	'blocks.registerBlockType',
	'core/border/addAttributes',
	addAttributes
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'core/border/addSaveProps',
	addSaveProps
);

addFilter(
	'blocks.registerBlockType',
	'core/border/addEditProps',
	addEditProps
);

addFilter(
	'editor.BlockListBlock',
	'core/border/with-border-color-palette-styles',
	withBorderColorPaletteStyles
);
