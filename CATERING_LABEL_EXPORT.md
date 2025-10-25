# Catering Label Export for Phomemo M110

## Feature Overview
Automatically generate batch-printable labels for Phomemo M110 thermal printer from catering orders.

## How It Works

### In the App
1. Go to **Catering** page
2. Find your order
3. Click **"EXPORT LABELS"** button
4. Excel file downloads: `Labels_CustomerName_Oct-25-2025.xlsx`

### File Contents
- **COMPANY**: JAYNA GYRO CATERING
- **ITEM**: Menu item name (Tzatziki Sauce, Baba Ghanoush, etc.)
- **QUANTITY**: Portions + Pan number (e.g., "20 portions - Pan 1 of 2")
- **CUSTOMER**: Date + Customer last name + Phone

### Label Generation Logic
One label per container:
- **BYO Gyros**: 3 sauce containers per set (10 portions), greens, veggies, pitas
- **Salads**: Multiple pans + individual dressing containers
- **Dips**: Main containers + optional veggie/pita sides
- **All other items**: Based on prep list quantities

### Using with Print Master App
1. Open **Print Master** app on phone
2. Create **new label template** (40mm x 30mm)
3. Add **4 text fields** to template
4. Click **"Excel"** import button
5. Select downloaded `.xlsx` file
6. App auto-maps columns to text fields
7. **Batch print all labels**

## Technical Details

### Library Used
**ExcelJS v4.4.0** - Creates native Excel format compatible with mobile apps

### Why ExcelJS?
- SheetJS created minimal Excel files that Print Master couldn't parse
- ExcelJS generates native Microsoft Excel format with proper metadata
- Includes workbook properties, column widths, native structure
- Compatible with Excel mobile apps

### File Format
- Extension: `.xlsx`
- MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Structure: Native Excel with workbook metadata
- Headers: UPPERCASE (COMPANY, ITEM, QUANTITY, CUSTOMER)
- Column widths: 25, 30, 25, 35

### Code Location
- Main function: `exportLabelsCSV()` in `catering.html` (line ~2437)
- Excel generator: `generateLabelsExcel()` (line ~2728)
- Label prep logic: `generateLabelsFromPrep()` (line ~2503)

## Troubleshooting

### File won't import to Print Master
- Make sure you created label template FIRST with 4 text fields
- Template must be created BEFORE importing Excel file
- Verify template size matches label size (40mm x 30mm for M110)

### Missing labels
- Check prep list calculation logic in `generateLabelsFromPrep()`
- Verify all order line items are in database

### Wrong customer info
- Customer last name extracted from `order.customer_name`
- Phone from `order.phone_number`
- Date from `order.delivery_date`

## Future Enhancements
- [ ] Add customer name to label (currently just last name)
- [ ] Color-code labels by order type
- [ ] Include allergen warnings on labels
- [ ] Support for multiple printers/sizes
