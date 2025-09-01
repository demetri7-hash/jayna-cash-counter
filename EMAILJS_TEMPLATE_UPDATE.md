# EmailJS Template Update for Deposit Rounding Breakdown

## New Template Variables Available:

You can now add these variables to your EmailJS template to show the deposit rounding breakdown:

### Available Variables:
- `{{has_deposit_rounding}}` - "true" if deposit rounding occurred, "false" if not
- `{{raw_deposit_amount}}` - Original exact deposit amount (e.g., "225.85")
- `{{deposit_rounding_adjustment}}` - How much rounding was needed (e.g., "0.15") 
- `{{deposit_tip_adjustment}}` - Whole dollars taken from tips (e.g., "1.00")
- `{{deposit_excess_to_cashbox}}` - Excess amount sent to cashbox (e.g., "0.85")
- `{{deposit_amount}}` - Final rounded deposit amount (e.g., "226")

### Suggested EmailJS Template Addition:

Add this section to your Manager Breakdown section in your EmailJS template:

```html
{{#has_deposit_rounding}}
<div style="background-color: #fff3cd; padding: 10px; margin: 10px 0; border: 1px solid #ffeaa7;">
    <div style="font-weight: bold; margin-bottom: 5px;">🔄 DEPOSIT ROUNDING BREAKDOWN:</div>
    <div>Raw Deposit Amount: ${{raw_deposit_amount}}</div>
    <div>Rounded Deposit Amount: ${{deposit_amount}}</div>
    <div>Rounding Adjustment Needed: ${{deposit_rounding_adjustment}}</div>
    <div>Taken from Tips (Whole $): -${{deposit_tip_adjustment}}</div>
    <div style="color: #28a745; font-weight: bold;">Excess to Cashbox: +${{deposit_excess_to_cashbox}}</div>
</div>
{{/has_deposit_rounding}}
```

### Example Output When Rounding Occurs:
```
🔄 DEPOSIT ROUNDING BREAKDOWN:
Raw Deposit Amount: $225.85
Rounded Deposit Amount: $226
Rounding Adjustment Needed: $0.15
Taken from Tips (Whole $): -$1.00
Excess to Cashbox: +$0.85
```

### When It Appears:
This breakdown will only appear in emails when deposit rounding actually occurs (when the raw deposit amount has cents that require rounding to whole dollars).

### Integration:
Place this section in your EmailJS template after the tip adjustment section and before the final owed amounts in the Manager Breakdown section.
