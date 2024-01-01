# Simple record admin panel

## Technical Requirenments

### Overview
This repository implements a web interface for creating, editing, and deleting
records, involving backend requests for entity manipulation 
(saving, updating, deleting). The interface also includes a table for 
displaying records with filtering and sorting capabilities, maintaining a 
consistent design.

### Pages
1. **Create/Edit Page**
    - Form for creating/editing a record
    - Validation using libraries (e.g., Joi)
    - Country, state, and city data from [country-state-city](https://github.com/harpreetkhalsagtbit/country-state-city)
    - Fields:
        - "Name" (mandatory, string, letters only)
        - "Phone Number" (mandatory, phone number format)
        - "Email" (mandatory, email format)
        - "Email Confirmation" (mandatory, matches the "Email" field)
        - "Country" - autocomplete field, with dependent fields ("List of States" and "List of Cities")
        - "List of States in the Country" - depends on the selected country
    - Apply button disabled until all mandatory fields are filled

2. **Edit Page**
    - Form for editing a record
    - Back link to the record list page
    - Similar to the create page with pre-filled values

3. **Record List Page**
    - Display of records with sorting options
    - Sorting by country, state, city, and other columns
    - Client-side sorting and convenient filtering for all fields

4. **Success Modal after Creation**
    - Modal with information on successful record creation
    - Link to the record list page, focusing on the newly created and highlighted record

5. **Success Modal after Update**
    - Modal with information on successful record update
    - Link to the record list page, focusing on the updated and highlighted record

6. **Deletion Confirmation Modal**
    - Modal confirming record deletion
    - Buttons for confirmation and cancellation

7. **Simple Node.js Backend**
    - Data stored in a text-based JSON file
    - Methods for getting the list, creating, updating, and deleting records


## Technical stack
### Frontend
* React
* Typescript
* [Joi](https://github.com/joi) for schema validation
* [MaterialUI](https://github.com/mui/material-ui) from Google
* [Data table](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/mui-datatables) for MaterialUI
* [country-state-city](https://github.com/harpreetkhalsagtbit/country-state-city) for location
* [google-libphonenumber](https://ruimarinho.github.io/google-libphonenumber) for phones
* [react-input-mask](https://github.com/sanniassin/react-input-mask) as input mask

### Backend
* NodeJS
* Typescript
* [nedb](https://github.com/seald/nedb) as file-based JSON lines database with
MongoDB-like interface
* [express](http://expressjs.com) as http server
* [lodash](https://lodash.com) for useful utils
* [Joi](https://github.com/joi) for schema validation
* [country-state-city](https://github.com/harpreetkhalsagtbit/country-state-city) for location
* [google-libphonenumber](https://ruimarinho.github.io/google-libphonenumber) for phones


## Prepare and run
To run program follow the steps:
1. cd frontend && npm build
2. cd backend && npm run
3. navigate to http://localhost:7894/all 