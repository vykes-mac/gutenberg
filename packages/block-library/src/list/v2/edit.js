/**
 * WordPress dependencies
 */
import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton } from '@wordpress/components';
import { isRTL, __ } from '@wordpress/i18n';
import {
	formatListBullets,
	formatListBulletsRTL,
	formatListNumbered,
	formatListNumberedRTL,
} from '@wordpress/icons';
import { useEffect } from '@wordpress/element';
import { useRegistry, useDispatch } from '@wordpress/data';

/**
 * Internal dependencies
 */
import OrderedListSettings from '../ordered-list-settings';
import { migrateToListV2 } from './migrate';

const TEMPLATE = [ [ 'core/list-item' ] ];

/**
 * At the moment, deprecations don't handle create blocks from attributes
 * (like when using CPT templates). For this reason, this hook is necessary
 * to avoid breaking templates using the old list block format.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} clientId   Block client ID.
 */
function useMigrateOnLoad( attributes, clientId ) {
	const registry = useRegistry();
	const { updateBlockAttributes, replaceInnerBlocks } = useDispatch(
		blockEditorStore
	);

	useEffect( () => {
		// As soon as the block is loaded, migrate it to the new version.

		if ( ! attributes.values ) {
			return;
		}
		const [ newAttributes, newInnerBlocks ] = migrateToListV2( attributes );

		registry.batch( () => {
			updateBlockAttributes( clientId, newAttributes );
			replaceInnerBlocks( clientId, newInnerBlocks );
		} );
	}, [ attributes.values ] );
}

function Edit( { attributes, clientId, setAttributes } ) {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: [ 'core/list-item' ],
		template: TEMPLATE,
	} );
	useMigrateOnLoad( attributes, clientId );
	const { ordered, reversed, start } = attributes;
	const TagName = ordered ? 'ol' : 'ul';

	const controls = (
		<BlockControls group="block">
			<ToolbarButton
				icon={ isRTL() ? formatListBulletsRTL : formatListBullets }
				title={ __( 'Unordered' ) }
				describedBy={ __( 'Convert to unordered list' ) }
				isActive={ ordered === false }
				onClick={ () => {
					setAttributes( { ordered: false } );
				} }
			/>
			<ToolbarButton
				icon={ isRTL() ? formatListNumberedRTL : formatListNumbered }
				title={ __( 'Ordered' ) }
				describedBy={ __( 'Convert to ordered list' ) }
				isActive={ ordered === true }
				onClick={ () => {
					setAttributes( { ordered: true } );
				} }
			/>
		</BlockControls>
	);

	return (
		<>
			<TagName
				reversed={ reversed }
				start={ start }
				{ ...innerBlocksProps }
			/>
			{ controls }
			{ ordered && (
				<OrderedListSettings
					setAttributes={ setAttributes }
					ordered={ ordered }
					reversed={ reversed }
					start={ start }
				/>
			) }
		</>
	);
}

export default Edit;
