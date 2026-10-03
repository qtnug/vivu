const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lo_trinh.txt');
const content = fs.readFileSync(filePath, 'utf8');

// We can split or find each route group
// Group by <td class="m-fleet-title txtRoute-search"...>
const items = [];
const blocks = content.split(/<tr class="fleed-hide-show-\d+">\s*<td class="m-fleet-title txtRoute-search"[^>]*>/i);

// The first block is header/table intro
for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  
  // Extract route title: Tuyến [01] Bến xe Gia Lâm - Bến xe Yên Nghĩa
  const titleEnd = block.indexOf('</td>');
  const titleText = block.substring(0, titleEnd).trim();
  
  const titleMatch = titleText.match(/Tuyến\s*\[(.*?)\]\s*(.*)/i);
  const routeCode = titleMatch ? titleMatch[1].trim() : '';
  const routeName = titleMatch ? titleMatch[2].trim() : titleText;

  // Extract Enterprise
  const enterpriseMatch = block.match(/Xí nghiệp<\/td>\s*<td class="m-fleet-item-content txtEnterprise-search">\s*([\s\S]*?)\s*<\/td>/i);
  const enterprise = enterpriseMatch ? enterpriseMatch[1].trim() : '';

  // Extract Interval
  const intervalMatch = block.match(/Giãn cách chạy xe<\/td>\s*<td class="m-fleet-item-content">\s*([\s\S]*?)\s*<\/td>/i);
  const interval = intervalMatch ? intervalMatch[1].trim() : '';

  // Extract Operating Hours
  const hoursMatch = block.match(/Thời gian hoạt động<\/td>\s*<td class="m-fleet-item-content">\s*([\s\S]*?)\s*<\/td>/i);
  const operatingHours = hoursMatch ? hoursMatch[1].trim() : '';

  // Extract Price
  const priceMatch = block.match(/Giá vé<\/td>\s*<td class="m-fleet-item-content">\s*([\s\S]*?)\s*<\/td>/i);
  const price = priceMatch ? priceMatch[1].trim() : '';

  // Extract Forward Route
  const forwardMatch = block.match(/Lộ trình chiều đi<\/td>\s*<td class="m-fleet-item-content txtRoad-go-search"[^>]*>\s*([\s\S]*?)\s*<\/td>/i);
  const forwardPath = forwardMatch ? forwardMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Extract Backward Route
  const backwardMatch = block.match(/Lộ trình chiều về<\/td>\s*<td class="m-fleet-item-content txtRoad-back-search"[^>]*>\s*([\s\S]*?)\s*<\/td>/i);
  const backwardPath = backwardMatch ? backwardMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  if (routeCode) {
    items.push({
      route_code: routeCode,
      route_name: routeName,
      enterprise,
      interval,
      operating_hours: operatingHours,
      price,
      forward_path: forwardPath,
      backward_path: backwardPath
    });
  }
}

console.log(`Parsed ${items.length} routes from lo_trinh.txt`);
console.log('Sample parsed route:', items[0]);
console.log('Last parsed route:', items[items.length - 1]);
