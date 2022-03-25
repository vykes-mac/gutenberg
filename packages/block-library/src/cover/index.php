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
	if( false === $attributes['useFeaturedImage'] ) {
		return $content;
	}

	$currentFeaturedImage = get_the_post_thumbnail_url();

	if( false === $currentFeaturedImage ) {
		return $content;
	}

	$isImgElement = ! ( $attributes['hasParallax'] || $attributes['isRepeated'] );
	$isImageBackground = $attributes['backgroundType'] === 'image';

	if( $isImageBackground && ! $isImgElement ) {
		$content = preg_replace(
			'/class=\".*?\"/',
			'${0} style="background-image:url(' . $currentFeaturedImage . ')"',
			$content,
			1
		);
	}

	if( $isImageBackground && $isImgElement ) {
		$objectPosition = '';
		if ( $attributes['focalPoint'] ) {
			$objectPosition = round( $attributes['focalPoint']['x'] * 100 ) . '%'. ' ' .
			round( $attributes['focalPoint']['x'] * 100 ) . '%';
		}


		$image_template = '<img
			class="wp-block-cover__image-background"
			alt="%s"
			src="%s"
			style="object-position: %s"
			data-object-fit="cover"
			data-object-position="%s"
		/>';

		$image = sprintf(
			$image_template,
			$attributes['alt'],
			$currentFeaturedImage,
			$objectPosition,
			$objectPosition
		);

		$content = str_replace(
			'</span><div',
			'</span>' . $image . '<div',
			$content,
		);

	}

	return $content;
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
