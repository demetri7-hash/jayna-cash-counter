# Jayna Gyro Cash Counter - Project Summary

## Current State

### **Application Overview**
The Jayna Gyro Cash Counter is a production-ready, web-based cash management system that has been successfully deployed and is actively used by Jayna Gyro restaurant staff for daily cash counting operations. The application replaces manual paper-based counting with a structured, error-resistant digital workflow that ensures accuracy and provides automated reporting to management.

### **Operational Status**
- **PRODUCTION READY**: Version 2.84 deployed and actively used by restaurant staff
- **Daily Usage**: Staff use the system for morning (AM) and evening (PM) cash counts
- **Manager Reports**: Automated email reports generated daily for management oversight
- **Data Integrity**: All counts stored securely with complete audit trails
- **Zero Downtime**: System has been stable and reliable in production use

### **Current Version: 2.84**
- **Deployment Date**: September 1, 2025
- **Major Features**: Comprehensive PM deposit rounding logic, enhanced PDF generation, email template matching
- **Status**: Fully functional with enhanced mathematical transparency
- **User Feedback**: Positive - clearer deposit amounts and professional interface

## Architecture

### **Frontend Architecture**
- **Single Page Application (SPA)**: Built with vanilla HTML, CSS, and JavaScript
- **Progressive Web App (PWA)**: Can be installed on devices for app-like experience
- **Mobile-First Design**: Optimized for tablet/mobile usage with large touch targets
- **Responsive Layout**: Adapts to different screen sizes and orientations
- **Real-Time Calculations**: Immediate feedback as users input denomination quantities

### **Backend Services**
- **Database**: Supabase (PostgreSQL) cloud-hosted database
  - URL: `https://gaawtbqpnnbbnsyswqwv.supabase.co`
  - Secure connection with API keys
  - Real-time data storage and retrieval
- **Email Service**: EmailJS for automated report delivery
  - Service ID: `service_xm62z73`
  - Template ID: `template_cash_report`
  - Reliable email delivery to management

### **Data Structure**
```sql
-- Primary table: cash_counts
{
  date: DATE,
  am_counter: TEXT,
  am_timestamp: TIMESTAMP,
  am_total: NUMERIC,
  am_drawer1_total: NUMERIC,
  am_drawer1_skip: BOOLEAN,
  am_drawer1_skip_reason: TEXT,
  am_drawer1_data: JSONB,
  am_drawer2_total: NUMERIC,
  am_drawer2_skip: BOOLEAN,
  am_drawer2_skip_reason: TEXT,
  am_drawer2_data: JSONB,
  am_notes: TEXT,
  pm_counter: TEXT,
  pm_timestamp: TIMESTAMP,
  pm_total: NUMERIC,
  pm_cash_tips: NUMERIC,
  pm_toast_sales: NUMERIC,
  pm_drawer1_total: NUMERIC,
  pm_drawer1_skip: BOOLEAN,
  pm_drawer1_skip_reason: TEXT,
  pm_drawer1_data: JSONB,
  pm_drawer2_total: NUMERIC,
  pm_drawer2_skip: BOOLEAN,
  pm_drawer2_skip_reason: TEXT,
  pm_drawer2_data: JSONB,
  pm_notes: TEXT,
  pm_discrepancy: NUMERIC,
  pm_adjusted_tips: NUMERIC,
  pm_drawer_over_amount: NUMERIC,
  pm_deposit_amount: NUMERIC,
  pm_amount_to_keep: NUMERIC
}
```

### **Core Business Logic**
#### **calculatePMAmounts() Function**
The heart of the system implementing sophisticated deposit rounding logic:

1. **Raw Deposit Calculation**: `Toast Sales + Original Tips = Raw Deposit`
2. **Rounding Logic**: Round raw deposit to nearest whole dollar
3. **Tip Adjustment**: Balance books by adjusting tips for rounding difference
4. **Shortage Handling**: Take whole dollars from tips to cover any shortages
5. **Final Calculations**: Ensure all amounts are whole dollars for staff simplicity

#### **Key Mathematical Flow**
```javascript
// Step 1: Calculate raw deposit
const rawDepositAmount = toastSales + cashTips;
const depositAmount = Math.round(rawDepositAmount);

// Step 2: Handle rounding adjustments
const depositRoundingAdjustment = rawDepositAmount - depositAmount;

// Step 3: Adjust tips to maintain balance
const finalTips = cashTips - tipAdjustments;

// Step 4: Calculate return amount to cashbox
const returnAmount = amTotal + discrepancies + excesses;
```

## Technologies Used

### **Frontend Technologies**
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with flexbox, grid, and animations
- **JavaScript (ES6+)**: Vanilla JavaScript for maximum compatibility
- **Progressive Web App APIs**: Service worker capabilities for offline resilience

### **External Libraries**
- **Supabase Client**: `@supabase/supabase-js@2` for database operations
- **EmailJS**: `@emailjs/browser@3` for email service integration
- **PDF Generation**: 
  - `html2pdf.js@0.10.1` for primary PDF generation
  - `jspdf@2.5.1` and `jspdf-autotable@3.5.31` for enhanced PDF capabilities

### **Development Tools**
- **Version Control**: Git with GitHub repository
- **Backup Strategy**: Multiple versioned backup folders for safe development
- **Documentation**: Comprehensive markdown documentation with change logs

### **Infrastructure**
- **Hosting**: Static file hosting (compatible with any web server)
- **Database**: Supabase cloud PostgreSQL with real-time capabilities
- **Email**: EmailJS cloud service for reliable email delivery
- **Security**: HTTPS enforcement, secure API keys, password-protected admin features

## Current Deployment

### **Production Environment**
- **Status**: LIVE and actively used by restaurant staff
- **Access**: Web application accessible via browser
- **Performance**: Fast loading, responsive interface optimized for mobile devices
- **Reliability**: Stable operation with comprehensive error handling

### **User Workflows**

#### **AM Count (Morning Operations)**
1. Staff selects current date and their name
2. Counts cash in both registers (Drawer 1 and Drawer 2)
3. Inputs denomination quantities for bills and coins
4. Can skip drawers with required reason (maintenance, broken register, etc.)
5. Adds optional notes for PM shift communication
6. System calculates total and stores in database

#### **PM Count (Evening Operations)**
1. System automatically loads AM data for context
2. Staff performs end-of-day cash count
3. Inputs Toast POS sales amount and cash tips
4. System calculates deposit amount (rounded to whole dollars)
5. Shows clear instructions for deposit envelope and cashbox return
6. Automatically emails comprehensive report to management
7. Displays success screen with exact amounts for staff

#### **Report Generation**
1. Management can generate reports for any historical date
2. Single day reports show complete breakdown with PDF download
3. Date range reports provide summary data across multiple days
4. Reports match email template format exactly for consistency

### **Security Features**
- **Password Protection**: Admin password required for historical date changes
- **Data Validation**: Comprehensive input validation and error handling
- **Secure Communications**: HTTPS and encrypted database connections
- **Audit Trail**: Complete tracking of who performed each count and when

## Next Steps

### **Immediate Priorities**
1. **System Monitoring**: Continue monitoring daily usage for any issues
2. **User Feedback Collection**: Gather staff feedback on deposit rounding improvements
3. **Performance Optimization**: Monitor PDF generation and email delivery performance
4. **Documentation Updates**: Keep change logs current with any future modifications

### **Potential Enhancements**
1. **Analytics Dashboard**: Weekly/monthly summary reports for management
2. **Staff Management**: Enhanced user management with role-based permissions
3. **Historical Analysis**: Trend analysis and pattern recognition in cash flows
4. **Mobile App**: Native mobile application for improved user experience
5. **Backup Systems**: Automated data backup and recovery procedures
6. **Integration Options**: Potential integration with other restaurant management systems

### **Maintenance Tasks**
1. **Regular Backups**: Ensure database backups are current and tested
2. **Security Updates**: Monitor and update external dependencies
3. **Performance Reviews**: Periodic assessment of system performance
4. **User Training**: Ongoing training for new staff members
5. **Feature Refinements**: Based on user feedback and operational needs

---

**Last Updated**: September 29, 2025  
**Version**: 2.84  
**Status**: Production Ready - Actively Used  
**Confidence Level**: HIGH - System proven in daily operations