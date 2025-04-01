# GUS REGON API Notes

## About GUS REGON API

The GUS REGON API (Baza Internetowa REGON - BIR) provides access to the Polish Central Statistical Office's database of companies and other business entities. This API allows you to search for companies by NIP (VAT number), REGON number, or KRS number and retrieve detailed information about them.

## API Key Registration

1. Register at [https://api.stat.gov.pl/Home/RegonApi](https://api.stat.gov.pl/Home/RegonApi)
2. After approval, you'll receive an API key via email
3. Keep this key confidential - it has usage limits

## Technical Details

The API uses SOAP protocol with the following endpoints:
- Production: `https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc`
- Test: `https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc`

### Authentication

Authentication is performed using the `Zaloguj` method with your API key. The response contains a session ID (SID) which must be used for subsequent requests.

### Main Methods

1. **Zaloguj** (Login)
   - Input: API key
   - Output: Session ID (SID)

2. **DaneSzukajPodmioty** (Search Entities)
   - Input: Search parameters (NIP, REGON, KRS, etc.)
   - Output: Basic entity information

3. **DanePobierzPelnyRaport** (Get Full Report)
   - Input: REGON number and report type
   - Output: Detailed entity information

4. **Wyloguj** (Logout)
   - Input: Session ID
   - Output: Boolean success status

### Common Report Types

- **PublDaneRaportPrawna**: For legal entities
- **PublDaneRaportDzialalnosciFizycznej**: For sole proprietorships
- **PublDaneRaportDzialalnosciPrawnej**: For PKD codes (business activities)

## Usage Notes

- The API has daily request limits
- Session expires after 60 minutes of inactivity
- Always logout after completing your requests
- For production use, consider implementing caching
- Response data is in Polish

## Reference Documentation

For more details, refer to the files in the "Instruction to GUS REGON API" folder, which contains the official API documentation from GUS, including:
- WSDL files
- PDF documentation
- Example requests and responses
- Data structures