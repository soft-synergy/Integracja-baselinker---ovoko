const nodemailer = require('nodemailer');

async function main() {
	const host = process.env.SMTP_HOST || 'ssl0.ovh.net';
	const port = parseInt(process.env.SMTP_PORT || '465', 10);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;

	if (!user || !pass) {
		console.error('Missing SMTP_USER or SMTP_PASS');
		process.exit(1);
	}

	const transporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
		tls: {
			servername: host
		}
	});

	try {
		const verified = await transporter.verify();
		console.log('SMTP verify result:', verified);
	} catch (error) {
		console.error('SMTP verify error:', error && error.message ? error.message : error);
		process.exitCode = 2;
	} finally {
		if (typeof transporter.close === 'function') {
			transporter.close();
		}
	}
}

main().catch((error) => {
	console.error('Unexpected error:', error && error.message ? error.message : error);
	process.exit(3);
});





































<?php
  /**
   * UPROSZCZONA TABELA PORÓWNAWCZA - PODS + 2x DODAJ DO KOSZYKA/ZOBACZ OPCJE
   * Dodano możliwość usuwania produktu z porównania (ikona "x" w nagłówku nad każdym produktem)
   */

  defined('YITH_WOOCOMPARE') || exit;

  global $product, $yith_woocompare;

  // --- PODS FIELDS DEFINITION ---
  $pods_fields_force = array(
		'stawka_za_wydruk_monochromatyczny_a4' => 'Stawka za jeden wydruk monochromatyczny A4',
      'stawka_za_wydruk_kolorowy_a4' => 'Stawka za jeden wydruk kolorowy A4',
      'typ_drukarki' => 'Typ drukarki',
      'rodzaj_urzadzenia' => 'Rodzaj urządzenia', 
      'format_wydruku' => 'Format wydruku',
      'druk_mfp' => 'Druk MFP',
      'mono_kolor' => 'Mono/Kolor',
      'polaczenie' => 'Połączenie',
      'pamiec' => 'Pamięć',
      'funkcje' => 'Funkcje',
      'maksymalny_rozmiar_papieru' => 'Maksymalny rozmiar papieru',
      'technologia' => 'Technologia',
      'klasyfikacja_lasera' => 'Klasyfikacja lasera',
      'panel_sterowania' => 'Panel sterowania',
      'wyswietlacz' => 'Wyświetlacz',
      'predkosc_druku_jednostronnego_a4_mono' => 'Prędkość druku jednostronnego A4 mono',
    
  );

  // --- SAFE GET PODS VALUE ---
  function safe_get_pods_value($field_key, $product_id) {
      $value = '';
      $value = get_post_meta($product_id, $field_key, true);
      if (empty($value)) {
          $value = get_post_meta($product_id, '_' . $field_key, true);
      }
      if (empty($value) && function_exists('pods_field')) {
          $value = pods_field($field_key, $product_id);
      }
      return !empty($value) ? $value : 'Brak danych';
  }

  // --- INIT VARS ---
  $fields = isset($fields) && is_array($fields) ? $fields : array();
  $different = isset($different) && is_array($different) ? $different : array();
  $products = isset($products) && is_array($products) ? $products : array();

  // --- ADD PODS FIELDS TO FIELDS ARRAY ---
  $fields = array_merge($fields, $pods_fields_force);

  // --- ADD PODS VALUES TO PRODUCTS ---
  if (!empty($products)) {
      foreach ($products as $product_id => $product) {
          if (is_object($product)) {
              if (!isset($product->fields) || !is_array($product->fields)) {
                  $product->fields = array();
              }
              foreach ($pods_fields_force as $field_key => $field_name) {
                  $product->fields[$field_key] = safe_get_pods_value($field_key, $product_id);
              }
          }
      }
  }

  /**
   * Get the lowest variation price (including sale) for a variable product.
   * Returns float or null if not found.
   */
  function get_lowest_variation_price_per_month($product) {
      if (!is_object($product)) return null;
      if ($product->is_type('variable')) {
          $variations = $product->get_available_variations();
          $min_price = null;
          foreach ($variations as $variation) {
              if (isset($variation['display_price'])) {
                  $price = floatval($variation['display_price']);
                  if ($min_price === null || $price < $min_price) {
                      $min_price = $price;
                  }
              }
          }
          if ($min_price !== null) {
              return $min_price / 48;
          }
      } else {
          // Simple product
          $price = floatval($product->get_price());
          if ($price > 0) {
              return $price / 48;
          }
      }
      return null;
  }
  ?>

  <style>
      table tbody>tr:nth-child(odd)>td, table tbody>tr:nth-child(odd)>th {
          background-color: transparent !important;
      }
      #yith-woocompare table.dataTable.compare-list tbody th, 
      #yith-woocompare table.dataTable.compare-list tbody td{
          border: none !important;
          padding: 18px !important;
      }
      table.compare-list tr.even, 
      table.compare-list tr.even th{
          background-color: #F9F9F9 !important;
      }
      table.compare-list tr.odd, 
      table.compare-list tr.odd th{
          background-color: #ffffff !important;
      }
      table.compare-list tr th{
          border-radius: 40px 0 0 40px !important;
      }
      table.compare-list tr td:last-child{
          border-radius: 0 40px 40px 0 !important;
      }
      #yith-woocompare .add_to_cart_button {
          padding: 15px 40px;
          border-radius: 33px;
          background: #004994;
      }
      table.compare-list img {
          max-height: 150px !important;
          object-fit: contain !important;
          box-shadow: 0 0 5px #eee;
          padding: 10px;
          border-radius: 10px;
      }
      #yith-woocompare table.compare-list td{
          text-align: left !important;
      }
      .product_info th{
          font-size: 0 !important;
      }
      .add-to-cart th{
          background: none !important;
          background-color: transparent !important;
      }
      /* Style PODS */
      
      .dzierzawa-od {
          display: block;
          margin-top: 6px;
          font-size: 15px;
          color: black;
          font-weight: 400;
      }
  .product_title, 
  .compare-list .product_title, 
  #yith-woocompare .product_title {
      font-weight: 700 !important;
  }
  /* Styl dla przycisku usuwania produktu */

  </style>

  <div id="yith-woocompare" class="woocommerce">

  <?php if (empty($products)): ?>
      <p>Brak produktów do porównania.</p>
  <?php else: ?>

      <table id="yith-woocompare-table" class="compare-list has-background">
          <thead>
              <tr>
                  <th>&nbsp;</th>
                  <?php foreach ($products as $product_id => $product): ?>
                      <td style="">
                          <?php if (isset($yith_woocompare) && is_object($yith_woocompare) && isset($yith_woocompare->obj)): ?>
                              <a href="<?php echo esc_url($yith_woocompare->obj->remove_product_url($product_id)); ?>" 
                                class="yith-woocompare-remove-product" 
                                title="Usuń produkt z porównania" 
                                data-product_id="<?php echo esc_attr($product_id); ?>" style="color: black;">
                                  usuń 
                              </a>
                          <?php endif; ?>
                      </td>
                  <?php endforeach; ?>
              </tr>
          </thead>
          <tfoot>
              <tr>
                  <th>&nbsp;</th>
                  <?php foreach ($products as $product_id => $product): ?>
                      <td></td>
                  <?php endforeach; ?>
              </tr>
          </tfoot>
          <tbody>
              <!-- Przycisk Remove (pozostawiamy dla kompatybilności, ale można usunąć jeśli niepotrzebny) -->
              <?php if (!isset($fields['product_info'])): ?>
                  <tr class="remove">
                      <th>&nbsp;</th>
                      <?php 
                      $index = 0;
                      foreach ($products as $product_id => $product):
                          $product_class = ((0 === ($index % 2)) ? 'odd' : 'even') . ' product_' . $product_id;
                      ?>
                          <td class="<?php echo esc_attr($product_class); ?>">
                              <?php if (isset($yith_woocompare) && is_object($yith_woocompare) && isset($yith_woocompare->obj)): ?>
                                  <a href="<?php echo esc_url($yith_woocompare->obj->remove_product_url($product_id)); ?>" data-product_id="<?php echo esc_attr($product_id); ?>">
                                    
                                  </a>
                              <?php endif; ?>
                          </td>
                      <?php 
                          ++$index;
                      endforeach; 
                      ?>
                  </tr>
              <?php endif; ?>

              <!-- POLA -->
              <?php if (!empty($fields)): ?>
                  <?php foreach ($fields as $field => $name): ?>
                      <?php 
                      $is_pods_field = array_key_exists($field, $pods_fields_force);
                      $row_class = $is_pods_field ? 'pods-row' : '';
                      $row_class .= ' ' . esc_attr($field);
                      ?>
                      <tr class="<?php echo trim($row_class); ?>">
                          <th>
                              <?php echo esc_html($name); ?>
                              <?php if ($is_pods_field): ?>
                              <?php endif; ?>
                          </th>
                          <?php 
                          $index = 0;
                          foreach ($products as $product_id => $product):
                              $product_class = ((0 === ($index % 2)) ? 'odd' : 'even') . ' product_' . $product_id;
                          ?>
                              <td class="<?php echo esc_attr($product_class); ?>">
                                  <?php
                                  switch ($field) {
                                      case 'product_info':
                                          // Obrazek i nazwa produktu
                                          if (is_object($product)) {
                                              // Dodaj przycisk usuwania produktu także tutaj (nad obrazkiem)
                                              if (isset($yith_woocompare) && is_object($yith_woocompare) && isset($yith_woocompare->obj)) {
                                                  echo '<a href="' . esc_url($yith_woocompare->obj->remove_product_url($product_id)) . '" class="yith-woocompare-remove-product" title="Usuń produkt z porównania" data-product_id="' . esc_attr($product_id) . '">×</a>';
                                              }
                                              echo '<a href="' . esc_url($product->get_permalink()) . '">';
                                              if (method_exists($product, 'get_image')) {
                                                  echo '<div class="image-wrap">' . $product->get_image('yith-woocompare-image') . '</div>';
                                              }
                                              if (method_exists($product, 'get_title')) {
                                                  echo '<h4 class="product_title">' . esc_html($product->get_title()) . '</h4>';
                                              }
                                              echo '</a>';

                                              // Dzierżawa od X zł
                                              $dzierzawa = get_lowest_variation_price_per_month($product);
                                              if ($dzierzawa !== null && $dzierzawa > 0) {
                                                  // Zaokrąglamy do pełnych złotych
                                                  $dzierzawa_rounded = number_format(ceil($dzierzawa), 0, ',', ' ');
                                                  echo '<span class="dzierzawa-od">Dzierżawa od ' . $dzierzawa_rounded . ' zł</span>';
                                              }

                                              // Przycisk dodaj do koszyka/zobacz opcje
                                              if (function_exists('woocommerce_template_loop_add_to_cart')) {
                                                  echo '<div class="add_to_cart_wrap">';
                                                  woocommerce_template_loop_add_to_cart();
                                                  echo '</div>';
                                              }
                                              // Drugi przycisk: Zobacz opcje (jeśli produkt ma warianty)
                                          }
                                          break;

                                      case 'rating':
                                          if (is_object($product) && method_exists($product, 'get_average_rating')) {
                                              $rating = function_exists('wc_get_rating_html') ? wc_get_rating_html($product->get_average_rating()) : '';
                                              echo $rating ? '<div class="woocommerce-product-rating">' . wp_kses_post($rating) . '</div>' : '-';
                                          } else {
                                              echo '-';
                                          }
                                          break;

                                      default:
                                          if ($is_pods_field) {
                                              // POLE PODS
                                              $field_value = '';
                                              if (is_object($product) && isset($product->fields[$field])) {
                                                  $field_value = $product->fields[$field];
                                              }
                                              if (!empty($field_value) && $field_value !== 'Brak danych') {
                                                  echo '<span class="pods-value">' . esc_html($field_value) . '</span>';
                                              } else {
                                                  echo '<span class="pods-empty">Brak danych</span>';
                                              }
                                          } else {
                                              // STANDARDOWE POLE
                                              $field_value = '';
                                              if (is_object($product) && isset($product->fields[$field])) {
                                                  $field_value = $product->fields[$field];
                                              }
                                              if (!empty($field_value)) {
                                                  echo wp_kses_post(do_shortcode($field_value));
                                              } else {
                                                  echo '-';
                                              }
                                          }
                                          break;
                                  }
                                  ?>
                              </td>
                          <?php 
                              ++$index;
                          endforeach; 
                          ?>
                      </tr>
                  <?php endforeach; ?>
              <?php endif; ?>

              <!-- Powtórzona cena -->
              <?php if (isset($repeat_price) && $repeat_price === 'yes' && isset($fields['price'])): ?>
                  <tr class="price repeated">
                      <th><?php echo esc_html($fields['price']); ?></th>
                      <?php 
                      $index = 0;
                      foreach ($products as $product_id => $product):
                          $product_class = ((0 === ($index % 2)) ? 'odd' : 'even') . ' product_' . $product_id;
                      ?>
                          <td class="<?php echo esc_attr($product_class); ?>">
                              <?php 
                              if (is_object($product) && isset($product->fields['price'])) {
                                  echo wp_kses_post($product->fields['price']);
                              } else {
                                  echo '-';
                              }
                              ?>
                          </td>
                      <?php 
                          ++$index;
                      endforeach; 
                      ?>
                  </tr>
              <?php endif; ?>

              <!-- Powtórzony Add to Cart + Zobacz opcje -->
              <?php if (isset($repeat_add_to_cart) && $repeat_add_to_cart === 'yes'): ?>
                  <tr class="add-to-cart repeated">
                      <th>&nbsp;</th>
                      <?php 
                      $index = 0;
                      foreach ($products as $product_id => $product):
                          $product_class = ((0 === ($index % 2)) ? 'odd' : 'even') . ' product_' . $product_id;
                      ?>
                          <td class="<?php echo esc_attr($product_class); ?>">
                              <?php 
                              // 1. Dodaj do koszyka
                              if (function_exists('woocommerce_template_loop_add_to_cart')) {
                                  echo '<div class="add_to_cart_wrap">';
                                  woocommerce_template_loop_add_to_cart();
                                  echo '</div>';
                              }
                              // 2. Zobacz opcje jeśli variable
                              
                              ?>
                          </td>
                      <?php 
                          ++$index;
                      endforeach; 
                      ?>
                  </tr>
              <?php endif; ?>

          </tbody>
      </table>

  <?php endif; ?>

  </div>