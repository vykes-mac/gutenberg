<?php
/**
 * Server-side rendering of the `core/categories` block.
 *
 * @package WordPress
 */

/**
 * Renders the `core/categories` block on server.
 *
 * @param array $attributes The block attributes.
 *
 * @return string Returns the categories list/dropdown markup.
 */
function render_block_core_cover( $attributes, $content ) {
	if( $attributes['useFeaturedImage'] === false ) {
		return $content;
	}

	$currentFeaturedImage = get_the_post_thumbnail_url();

	return str_replace( 'WordPress://featured-image', $currentFeaturedImage, $content );
}

/**
 * Registers the `core/categories` block on server.
 */
function register_block_core_cover() {
	register_block_type_from_metadata(
		__DIR__ . '/cover',
		array(
			'render_callback' => 'render_block_core_cover',
		)
	);
}
add_action( 'init', 'register_block_core_cover' );