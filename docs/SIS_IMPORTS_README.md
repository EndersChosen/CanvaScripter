# SIS Imports Feature

## Overview
The SIS Imports feature allows you to generate CSV files for Canvas SIS (Student Information System) imports with realistic sample data. This feature supports all the major CSV file types defined in the Canvas SIS documentation.

## Features

### Single File Generation
- Create individual CSV files for specific SIS import types
- Specify the number of rows (1-10,000)
- **Custom email domain**: Set your own email domain for generated addresses
- **Authentication provider selection**: Choose from your Canvas instance's configured auth providers
- Preview sample data before generating
- Choose output location

### Bulk File Generation
- Create complete SIS import packages with multiple file types
- Select which file types to include
- Specify different row counts for each file type
- **Custom email domain**: Use your institution's email domain for all generated files
- **Authentication provider selection**: Apply the same auth provider to all user accounts
- Automatically create ZIP packages for Canvas upload
- Progress tracking for large datasets

## Supported File Types

### Core Files (Recommended for basic setup)
- **Users**: Student and teacher user accounts with login credentials
- **Accounts**: Department and organizational account structures
- **Terms**: Academic terms (Fall, Spring, Summer, Winter)
- **Courses**: Course listings with realistic course names
- **Sections**: Course sections
- **Enrollments**: Student and teacher enrollments in courses

### Optional Files (For advanced setups)
- **Groups**: Student group definitions
- **Group Categories**: Group category configurations
- **Admins**: Administrative user roles and permissions

## Generated Data Characteristics

### Users CSV
- Realistic first and last names
- **Email addresses**: Generated using your custom domain (e.g., `john.doe@yourschool.edu`)
- **Authentication provider**: Uses your selected Canvas authentication provider
- Login IDs derived from names
- All users set to "active" status
- Temporary passwords for new accounts

### Courses CSV
- Subject areas: Math, Science, English, History, Art, Music, etc.
- Course numbers ranging from 100-500 level
- Descriptive course titles
- Proper CSV escaping for special characters

### Enrollments CSV
- 85% students, 10% teachers, 5% teaching assistants
- Realistic distribution of roles
- All enrollments set to "active" status

### Terms CSV
- Seasonal terms with appropriate date ranges
- Fall: August-December
- Spring: January-May
- Summer: June-August

## Usage Instructions

### Single File Generation
1. Click "SIS Imports" in the left sidebar
2. Select "Create Single SIS File"
3. Choose the file type from the dropdown
4. Set the number of rows to generate
5. **Enter your email domain** (e.g., `@yourschool.edu`, `university.edu`, `@company.com`)
6. **For Users CSV**: Click "Fetch Providers" to load authentication providers, then select one
7. Click "Browse" to select output folder
8. Optionally click "Preview Sample Data" to see a sample
9. Click "Generate CSV File"

### Bulk Package Generation
1. Click "SIS Imports" in the left sidebar
2. Select "Create Bulk SIS Import Package"
3. Check the file types you want to include
4. Set row counts for each selected file type
5. **Enter your email domain** for all generated user accounts
6. **If including Users**: Click "Fetch Authentication Providers" and select one
7. Choose output folder
8. Optionally enable "Create ZIP file for upload"
9. Click "Generate SIS Import Package"

## Authentication Provider Configuration

The SIS Imports feature can automatically fetch and use your Canvas instance's configured authentication providers for generating user accounts.

### How It Works
1. **Automatic Discovery**: Click "Fetch Providers" to retrieve all authentication providers from your Canvas instance
2. **Provider Selection**: Choose from available providers including SAML, LDAP, CAS, Google, Microsoft, etc.
3. **Seamless Integration**: Selected providers are automatically applied to the `authentication_provider_id` field in Users CSV

### Supported Provider Types
- **Canvas** - Default Canvas authentication
- **SAML** - Security Assertion Markup Language
- **LDAP** - Lightweight Directory Access Protocol  
- **CAS** - Central Authentication Service
- **Google** - Google Workspace/Gmail authentication
- **Microsoft** - Azure AD/Office 365 authentication
- **Facebook** - Facebook authentication
- **GitHub** - GitHub authentication
- **LinkedIn** - LinkedIn authentication
- **Apple** - Apple ID authentication
- **Clever** - Clever education platform
- **OpenID Connect** - OpenID Connect protocol

### Setup Requirements
1. **Canvas Domain**: Enter your Canvas domain in the main form (e.g., `school.instructure.com`)
2. **API Token**: Provide a valid Canvas API token with appropriate permissions
3. **Account Access**: Token must have access to view authentication providers

### Usage Steps
1. Fill in Canvas domain and token in the main form
2. Select "Users" as the file type (auth providers only apply to user accounts)
3. Click "Fetch Providers" to retrieve available authentication providers
4. Select the desired provider from the dropdown
5. Generate your CSV file with the selected authentication provider

### Provider Display Format
Providers are displayed as: `Provider Type (ID: X)`
- Example: `SAML (ID: 123)`, `Google (ID: 456)`
- The ID number is used internally by Canvas to identify the provider

## Email Domain Configuration

The SIS Imports feature allows you to specify a custom email domain for all generated user accounts, making the data more realistic for your institution.

### Supported Formats
- **With @**: `@yourschool.edu`, `@university.com`, `@company.org`
- **Without @**: `yourschool.edu`, `university.com`, `company.org` (@ will be added automatically)

### Examples
- **Educational**: `@school.edu`, `@university.edu`, `@college.org`
- **Corporate**: `@company.com`, `@organization.org`
- **Government**: `@agency.gov`, `@department.gov`

### Default Domain
If no domain is specified, the system defaults to `@school.edu`.

### Generated Email Pattern
Emails are generated using the pattern: `firstname.lastname@yourdomain.com`
- Example: `john.smith@yourschool.edu`
- Special characters in names are automatically converted to lowercase
- Duplicate handling: Numbers may be appended to login IDs for uniqueness

## File Formats

All generated CSV files follow the official Canvas SIS import specifications:
- UTF-8 encoding
- Comma-separated values
- Header row included
- Proper quoting for fields containing commas or quotes
- ISO 8601 date format for timestamps

## Canvas Import Process

1. Generate your SIS import files using this tool
2. If you created a ZIP package, upload it directly to Canvas
3. If you created individual files, zip them manually or upload individually
4. In Canvas, go to Admin > Settings > SIS Import
5. Upload your ZIP file or individual CSV files
6. Review the import preview
7. Process the import

## Important Notes

- This tool generates **sample data only** - not real student or course information
- Always test imports in a Canvas test environment first
- The generated IDs are random and may not follow your institution's ID patterns
- You may need to modify the generated data to match your specific requirements
- For production use, ensure you have proper data governance and privacy policies in place

## Error Handling

The tool includes comprehensive error handling:
- Validates input parameters
- Provides clear error messages
- Handles file system permissions issues
- Previews data before generation to catch formatting issues
- **Authentication provider errors**: Provides specific error messages for API access issues
- **Token validation**: Verifies Canvas API token has necessary permissions

### Common Authentication Provider Issues
- **"Please enter Canvas domain and token"**: Fill in the main form fields first
- **"Failed to fetch authentication providers: 401"**: Invalid or expired API token
- **"Failed to fetch authentication providers: 403"**: Token lacks permission to view auth providers
- **"Failed to fetch authentication providers: 404"**: Invalid Canvas domain or account ID

## Future Enhancements

Potential additions to this feature:
- Custom data templates
- Integration with existing SIS systems
- More sophisticated ID generation patterns
- Support for additional Canvas SIS file types
- Data validation against Canvas import requirements
