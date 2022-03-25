<?php
/**
 * Functions used in style engine compatibility.
 *
 * @package gutenberg
 */

// Copied package PHP files .
if ( file_exists( __DIR__ . '/packages/class-wp-style-engine-gutenberg.php' ) ) {
	require __DIR__ . '/packages/class-wp-style-engine-gutenberg.php';
}

/**
 * This function returns the Style Engine instance.
 *
 * @return WP_Style_Engine_Gutenberg
 */
function gutenberg_get_style_engine() {
	if ( class_exists( 'WP_Style_Engine_Gutenberg' ) ) {
		return WP_Style_Engine_Gutenberg::get_instance();
	}
}
