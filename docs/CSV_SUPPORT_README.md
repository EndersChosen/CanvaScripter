# CSV Support for Communication Channel Reset

## Overview
The Communication Channel Reset feature now supports both TXT and CSV file formats for uploading email lists.

## Supported File Formats

### TXT Files (Original)
- One email address per line
- Emails can also be comma-separated on the same line
- Example:
```
user1@example.com
user2@example.com
user3@example.com
```

### CSV Files (New)
- Must contain a header row
- Must have one of the following column names (case-insensitive):
  - `path`
  - `email` 
  - `email_address`
  - `communication_channel_path`

#### Example CSV Format:
```csv
User ID,Name,Communication channel ID,Type,Path,Date of most recent bounce,Bounce reason
17390,Emerson Rexrode,17357,email,118280@augusta.k12.va.us,,
17528,Mylo Nunez,17440,email,115340@augusta.k12.va.us,,
18923,Ca'Shawn Johnson,17822,email,111569@augusta.k12.va.us,,
```

## Features

### Email Extraction
- Automatically detects CSV vs TXT files based on file extension
- Parses CSV headers to find the appropriate email column
- Handles CSV fields with commas and quotes correctly
- Filters out empty rows and non-email entries
- Provides detailed error messages if email column is not found

### Error Handling
- Clear error messages for missing email columns
- List of available columns when email column not found
- Validation that email addresses contain '@' symbol
- Detailed logging of parsing results

## Usage

1. Navigate to Communication Channels → Reset Communication Channels
2. Select "Upload file to reset (TXT or CSV)"
3. Click the "Upload" button
4. Choose your TXT or CSV file from the file dialog
5. The app will automatically:
   - Detect the file type
   - Parse emails appropriately
   - Display progress as emails are processed
   - Show results summary

## Error Messages

Common error scenarios and their messages:

- **Missing email column**: "Could not find email column in CSV. Expected column names: path, email, email_address, communication_channel_path. Available columns: [list of actual columns]"
- **No emails found**: "No valid email addresses found in the [column name] column. Please ensure the column contains email addresses with @ symbols."
- **CSV parsing error**: "CSV parsing error: [specific error details]"

## Technical Implementation

The CSV parsing includes:
- Proper handling of quoted fields with commas
- Case-insensitive column matching
- Robust CSV parsing that handles escaped quotes
- Automatic file type detection based on extension
- Fallback to text file parsing for unknown extensions
