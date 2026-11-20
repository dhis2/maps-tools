# DHIS2 Maps App Showcase: 12 Community of Practice Posts

Nov 11, 2026 · @Bruno Raimbault

## Series overview

Twelve weekly posts, each pairing one Maps app capability with one way DHIS2 is used in production. The mix follows the weight of each use case on the [DHIS2 In Action](https://dhis2.org/in-action/) page: health carries most of the series because ministries of health in 80 countries run DHIS2, and the other use cases get posts roughly in proportion to their scale. Every post states its benchmark and cites the guidance behind it, so domain experts can check the logic.

| Use case (DHIS2 In Action) | Scale of use | Posts |
| --- | --- | --- |
| Health programmes and HMIS | Ministries of health in 80 countries; 3.2 billion people live where DHIS2 is used | 1, 5, 6, 10, 11 |
| Disease surveillance | Integrated surveillance and outbreak response, including current Ebola support in the DRC and Uganda | 3, 4 |
| Climate and health | 18 implementing countries; Climate App installed in more than 9,000 DHIS2 instances | 2 |
| Logistics and supply chain | More than 36 countries capture facility vaccine stock data in DHIS2 | 8 |
| Education | More than 10 countries implementing DHIS2 for Education | 7 |
| Other sectors | Country examples in animal health, agriculture, WASH, justice and public services | 9, 12 |

Scale figures: [DHIS2 In Action](https://dhis2.org/in-action/), [Climate & Health at DAC2026](https://community.dhis2.org/t/dac2026-summary-wiki-ai-climate-health/75799), [Climate & Health phase 1 results](https://dhis2.org/achievements-wellcome-climate-health-phase-1/), [DHIS2 vaccine logistics](https://dhis2.org/?p=25329), [DHIS2 for Education implementations](https://education.dhis2.org/implementation), [DHIS2 Across Sectors](https://dhis2.org/across-sectors/).

| # | Post | Sector | Lead Maps app feature | Also shows |
| --- | --- | --- | --- | --- |
| 1 | Where are the unvaccinated? | Immunization (EPI) | Thematic layer with legend sets | Category indicator, chiefdom and facility close-ups, drill down |
| 2 | Rain today, malaria next month | Malaria / climate and health | Earth Engine climate layers | Split view, data table, bubbles over choropleth |
| 3 | Drawing the ring around cholera | Outbreak response (IDSR) | Event layer | Group events as donuts, style by data item (option set and number), buffers |
| 4 | Who hasn't been seen today? | Outbreak contact tracing (filovirus, mpox) | Tracked entity layer | Follow-up indicator, new cases by known contact, relationships across two programs |
| 5 | Two hours to emergency care | Maternal and newborn health | Facility layer | Catchments as a second facility geometry, WorldPop Global2, two-hour access indicator |
| 6 | Is 100% coverage too good to be true? | Neglected tropical diseases | Earth Engine population age groups | Legend sets with WHO thresholds, split view by year, denominator ratio |
| 7 | Every school on the map | Education (EMIS) | Org unit layer | Group set styling, labels, org unit profile, split view by census year |
| 8 | Seeing stockouts before patients do | Supply chain (LMIS) | Facility-level thematic layer | Facility reference layer, data table filtering |
| 9 | One bite, two sectors | One Health (animal and human health) | Two event layers from two programs | Group events as donuts, style by yes/no data item, buffers, thematic overlay |
| 10 | Map the data before you map the disease | HIS / data quality | Reporting rates in a thematic layer | Split view, facility close-up, interpretations, pinned legends |
| 11 | Watching the lean season | Nutrition (CMAM) | Timeline view | Chiefdom rates, OTP site bubbles, MUAC screening events styled by value |
| 12 | Green fields, empty granaries? | Agriculture and food security | Earth Engine vegetation indices | Rainfall against normal, landcover, bubbles, Sentinel-2 basemap |

Beyond the layers, the series shows the Maps app functions that turn a map into a decision, each where it fits the workflow best:

| Maps app function | What it does in the story | Posts |
| --- | --- | --- |
| Feature details (click a district, point or pixel) | Check one value or record without leaving the map | 2, 3, 4, 12 |
| Data table (sort, filter, highlight) | Turn the map into a ranked action list | 2, 6, 7, 8, 12 |
| Download data (GeoJSON) | Hand layer data to field teams, modellers or QGIS users | 2, 3, 6, 12 |
| Download map (PNG) | Put the map in a situation report, plan or bulletin | 3, 5, 7, 11, 12 |
| Open in Data Visualizer app | See the trend behind a coloured area | 1, 8, 11 |
| Interpretations with @mentions | Record the decision and notify the people who must act | 1, 5, 8, 9, 10, 11 |
| Dashboards, pinned legends and slideshow autoplay | Bring the map to the review meeting | 1, 2, 7, 9, 10 |
| Drill down and up | Move from a red district to the facilities behind it | 1 |
| Org unit profile | Open a school's or facility's key facts from the map | 5, 7 |
| Saving and sharing with user groups | Show sensitive maps only to the team that needs them | 4, 9 |
| Dashboard email push (HTML push analytics job) | Reach users who rarely log in | 10 |

Function details come from the [Maps user guide](https://docs.dhis2.org/cs/use/user-guides/dhis-core-version-240/analysing-data/maps.html) (data table, Download data, Open in Data Visualizer app, PNG download), the [DHIS2 2.31 release notes](https://community.dhis2.org/t/dhis-version-2-31-is-released/34292) (GeoJSON layer download) and the [Analytics Tools Academy maps guide](https://docs.dhis2.org/en/topics/training-docs/analytics-tools-academy/maps/traineraposs-guide-to-maps.html) (drill down, table filters, opening downloads in QGIS). Org unit profiles and dashboard email push need an administrator to set them up before the posts that use them.

Each post follows the same skeleton so readers know where to look:

1. **At a glance**: one line with the sector, Maps app features, data type and audience, for readers who skim.
2. **Hook**: one sentence with the question the map answers.
3. **The map**: each saved map, from the overview to the place to act, with its download, a link to open it, and its layers in drawing order with the settings that matter.
4. **How to read it**: what a pattern means and what action it points to.
5. **In the workflow**: who opens the map, when, which Maps app functions they use, and what decision comes out.
6. **Domain note**: the benchmark or threshold, with its source.
7. **In practice**: a documented country or programme using DHIS2 this way, with its source.
8. **Try it**: steps on the dedicated demo instance (see the Demo instance section) or your own instance.
9. **Your turn**: a call to share examples, limitations met and workarounds.

Attach a screenshot or the map's download (PNG) to each post, and link the saved map so readers can open it. Close each post with a link to the next one in the series. Post in the Implementation category with the maps tag, where the Maps app team has asked for use cases, and use demo or blurred data in any screenshot that shows individual cases.

**Map and publishing conventions.** Each post's legend sets use a ColorBrewer scheme that fits its subject (for example YlOrRd for malaria cases, BrBG for rainfall against normal, PiYG for gender parity, Greens for dog vaccination), so the maps look different side by side. The posts name the colours each map shows. Two maps colour yes and no, or good and bad, in the green and red readers expect (Post 9's bites by post-exposure prophylaxis, Post 11's MUAC screening); each has a colour-blind friendly copy in blue and red, because red and green is the pair most colour-blind readers confuse. Labels stay readable on every class. Choropleths show rates or ratios, never raw counts; counts go in bubbles. Each screenshot gets alt text stating the map's main finding and a caption reading "DEMO DATA, NOT REAL". Map and dashboard names end with "DEMO DATA, NOT REAL", map descriptions and dashboards start with it, and the demo's own data items carry "(demo data)" in their names, so legends, pop-ups and downloads say it too. Posts whose documented cases are francophone (2, 6, 7 and 8) end with a short French summary for the CoP's French-speaking members.

## The posts

Each post is its own file in [series/](series/), with its maps embedded. The images are the
maps' PNG downloads from the demo instance.

| # | Post | First map |
| --- | --- | --- |
| 1 | [Where are the unvaccinated? Access vs. utilization on the map](series/01-unvaccinated.md) | <img src="images/post01-1.png" width="240" alt="RED/REC category by district"> |
| 2 | [Rain today, malaria next month: climate layers next to case data](series/02-rain-malaria.md) | <img src="images/post02-1.png" width="240" alt="CHIRPS rainfall in July"> |
| 3 | [Drawing the ring around cholera: event layers with buffers](series/03-cholera-rings.md) | <img src="images/post03-1.png" width="240" alt="Suspected cholera cases by chiefdom"> |
| 4 | [Who hasn't been seen today? Outbreak contact follow-up on the map](series/04-contact-follow-up.md) | <img src="images/post04-1.png" width="240" alt="Contacts seen at daily visits by chiefdom"> |
| 5 | [Two hours to emergency care: mapping access to emergency obstetric care](series/05-emergency-obstetric-care.md) | <img src="images/post05-1.png" width="240" alt="Population and two-hour catchments"> |
| 6 | [Is 100% coverage too good to be true? Checking MDA denominators against WorldPop](series/06-mda-denominators.md) | <img src="images/post06-1.png" width="240" alt="Deworming coverage by round"> |
| 7 | [Every school on the map: teacher deployment and gender parity in an EMIS](series/07-schools.md) | <img src="images/post07-1.png" width="240" alt="Primary schools by pupil-teacher ratio"> |
| 8 | [Seeing stockouts before patients do: months of stock at facility level](series/08-stockouts.md) | <img src="images/post08-1.png" width="240" alt="Months of stock in Kenema"> |
| 9 | [One bite, two sectors: human and animal rabies data on one map](series/09-rabies-one-health.md) | <img src="images/post09-1.png" width="240" alt="Dog bites and rabid dogs"> |
| 10 | [Map the data before you map the disease: reporting completeness and feedback](series/10-reporting-completeness.md) | <img src="images/post10-1.png" width="240" alt="Reporting rate by district and month"> |
| 11 | [Watching the lean season: malnutrition admissions on a timeline](series/11-lean-season.md) | <img src="images/post11-1.png" width="240" alt="SAM admissions by chiefdom"> |
| 12 | [Green fields, empty granaries? Vegetation, rainfall and household food security](series/12-food-security.md) | <img src="images/post12-1.png" width="240" alt="Vegetation and food insecure households"> |

## Demo instance: data and metadata to generate

One dedicated instance, cloned from the Sierra Leone demo database, gives all 12 posts a shared and realistic geography: its national, district, chiefdom and facility levels, boundaries and facility coordinates ([DHIS2 data dimensions guide](https://docs.dhis2.org/en/use/user-guides/dhis-core-version-240/understanding-the-data-model/about-data-dimensions.html)). Programme metadata should come from DHIS2's WHO-aligned packages on [Metadata Downloads](https://dhis2.org/metadata-downloads/), the same ones the posts link to, so that only the data is synthetic. The [DHIS2 HMIS demo](https://dhis2.org/who-dq/) already combines many of these packages in one instance and is a useful reference for configuration.

### Instance setup

| Item | Requirement | Posts |
| --- | --- | --- |
| DHIS2 core | Latest stable release, v43 at its newest patch (2.43.2 in October 2026); move to 2.44 if it ships before the build | All |
| Maps app | Latest App Hub release (v101.17.5 on 30 September 2026), kept up to date; it brings the climate and vegetation sources, several timeline or split layers per map, custom calculations and pinned legends | All |
| Google Earth Engine | Service account key configured; a Maps app administrator enables Population, Population age groups, Building footprints, CHIRPS and ERA5 precipitation, ERA5 temperature and MODIS vegetation sources | 2, 3, 5, 6, 12 |
| Climate App | Installed, to import real CHIRPS and ERA5 series for Sierra Leone as data elements that drive the synthetic malaria data | 2 |
| Analytics | Tables regenerated after every data load and nightly | All |
| Org unit profile | Configured with key attributes, group sets and data items for facilities and schools | 5, 7 |
| Email and dashboard email push | SMTP configured and one HTML push analytics job set up in the Scheduler app | 10 |
| Users and sharing | One demo user per persona in the posts (EPI officer, surveillance lead, tracing supervisor, reproductive health planner, NTD manager, education director, district pharmacist, veterinary officer, HMIS officer, nutrition coordinator, agriculture planner), user groups that match, and a read-only public login | All |
| Saved content | One saved map and one dashboard per post, with seeded interpretations and @mentions between the demo users | All |

**Version note.** DHIS2 v43 is the latest stable release; its newest patch was 2.43.2 in early October 2026, when 2.44 was still a preview build ([dhis2w release notes](https://github.com/winterop-com/dhis2w/releases/tag/v1.32.0)). The Maps app ships separately and was at v101.17.5 on 30 September 2026 ([maps-app releases](https://github.com/dhis2/maps-app/releases/tag/v101.17.5)); the January 2026 community announcement of the climate layers is titled "v105.5", but GitHub numbers Maps releases 101.x, so simply install the latest App Hub version. v43 brings three features the posts rely on: climate and vegetation layers, several timeline or split layers on one map with synced periods, and custom calculations in the data item selector ([DHIS2 v43 overview](https://dhis2.org/releases/version-43/)). Check the sample database before building: in October 2026 the public 2.43.2 play instance briefly listed no org units ([dirigent-dhis2 release note](https://github.com/winterop-com/dirigent-dhis2/releases/tag/v0.23.3)).

### Shared metadata

- **Population data elements**, yearly, at chiefdom and facility level: total population, surviving infants, children 6–59 months, school-age children (5–14 years), women of reproductive age and expected pregnancies. Posts 1, 5, 6 and 11 use them as denominators. Also import WorldPop Global2 totals for the same groups with the Import/Export app's Earth Engine import and the DHIS2 WorldPop Global2 metadata package, so Post 6 can compare the two.
- **Org unit group sets**: reuse the demo's facility type and ownership sets (verify they are present), and add EmONC level (comprehensive, basic, none), OTP site (yes, no) and urban/rural if missing.
- **Legend sets**, one per benchmark used in the posts, each in the colour-blind-safe scheme of its post (see the overview conventions): Penta1 coverage (RED), Penta1–Penta3 dropout, MDA coverage at 65, 75 and 80%, pupil–teacher ratio relative to the national norm, gender parity index, stock status by months of stock, reporting rate at 75 and 90%, SAM cure rate at 75%, dog vaccination at 70%, EmONC facilities per 500,000, and share of food-insecure households.
- **Non-health org units**: schools for Post 7, at facility level next to the health facilities, with their own group set ("School level"). Education ministries usually run their own DHIS2; in the demo, health layers select facilities through a "Health facilities" group so the schools stay off them.

### Per-post metadata and synthetic data

The `demo-maps-showcase` tool in this folder builds the demo: metadata, synthetic data, saved maps,
dashboards, demo users and their interpretations, re-run monthly to roll the data forward. Its
[README](README.md) lists for each post the maps, the data generated and the patterns the data
must show, which `verify.js` checks through analytics.

### Rules for synthetic data

- **Label everything.** Real Sierra Leone boundaries with invented outbreaks can be mistaken for real events, especially for cholera and Ebola-like scenarios. Put "DEMO DATA, NOT REAL" in every map name, map description, dashboard and screenshot caption.
- **Generate, never derive.** Names, IDs and ages come from a generator, not from any real register, and household points are placed at random near a facility of the right district.
- **Stay plausible.** Keep rates within realistic ranges, add seasonality and noise, and drive climate-sensitive series from the real rainfall and temperature imported with the Climate App, so lags look natural.
- **Plant the patterns, then check them.** Before each post goes live, open its saved map and confirm the patterns in the table above are visible.
- **Keep the dates rolling.** The posts use relative periods such as "last 12 months", so keep the generator in a script and re-run it monthly to shift the data forward; otherwise the maps empty out over time.

### Build order

1. Download the Sierra Leone sample database for the newest v43 patch from DHIS2 Downloads, and check that its org unit hierarchy, boundaries and facility coordinates load.
2. Update the Maps app to the latest App Hub release, install the Climate App, and configure the Earth Engine key and layer sources.
3. Inventory what the demo already has against the tables above, and list what is missing.
4. Import the needed packages from Metadata Downloads and map them to the Sierra Leone org units.
5. Create the custom metadata: group sets, legend sets, relationship type, agriculture data set, schools.
6. Generate and import the synthetic data through the API, then run analytics.
7. Build the saved maps and dashboards for each post, and seed interpretations between demo users.
8. Set sharing and demo logins, then point every post's Try it step to the new instance.
9. Schedule the monthly re-run that rolls the data forward.

## External review: findings and changes

The series was reviewed through five lenses: GIS and cartography, DHIS2 implementation, the domain of each post, the Community of Practice audience, and privacy. Each finding was checked against current sources before it changed the doc; the sources sit inline in the posts.

| Lens | Finding | Change made | Posts |
| --- | --- | --- | --- |
| GIS | Red–green legends are unreadable for the most common colour blindness | Colour-blind-safe ColorBrewer schemes chosen per subject; the two green and red maps (Posts 9 and 11) get a colour-blind friendly copy; simulator check added to the checklist | All |
| GIS | Choropleths of raw counts mislead when areas differ in population | SAM admissions mapped per 1,000 children; counts kept for bubbles | 11, 12 |
| GIS | Straight-line buffers misstate access where rivers, roads and seasons matter | Travel-time catchments stored as a second facility geometry, with population aggregated per catchment | 5 |
| GIS | District means of 5–9 km climate grids ignore where people live | Resolution caveat and population-weighted aggregation added | 2 |
| GIS | NDVI read against the wrong crop calendar for the demo country; cloud noise ignored | Crop months for Malawi and Sierra Leone; cloud caveat added | 12 |
| GIS | Comparing two data tables by eye is error-prone | Denominator ratio layer built from imported WorldPop Global2 | 6 |
| DHIS2 | "Push analysis" is the legacy feature; current versions use dashboard email push (the HTML push analytics job) | Renamed in the overview, Post 10 and the demo setup | 10 |
| DHIS2 | WorldPop Global2 (yearly 2015–2030, by age and sex) replaced Global1 in Maps app v101.6.0, and old saved maps keep Global1 | Posts 5 and 6 and the demo setup use Global2 with the year set | 5, 6 |
| DHIS2 | Reporting rates count forms, not their content | Data element completeness and the WHO Data Quality Tool added | 10 |
| DHIS2 | Existing tools went unmentioned | Immunization Analysis app, Health Facility Profile package and the malaria climate-planning guide linked | 1, 2, 5 |
| EPI | Zero-dose strategies rank areas by number of children, not only by percentage | Optional zero-dose bubble layer | 1 |
| Cholera | Ring radius depends on density and line-list quality | Nigeria evidence and a building-footprint check added | 3 |
| Outbreaks | Supervisors need follow-up performance, not only the contact network | Contacts-seen-in-24-hours layer | 4 |
| Maternal health | The current global benchmark is two-hour travel time (EPMM) | EPMM target added beside the 2009 per-population standard | 5 |
| Education | The unadjusted parity index is asymmetric | Adjusted index (GPIA) with formula and source | 7 |
| Food security | Field assessments should be read against the official classification | Cadre Harmonisé (West Africa) and IPC reference added | 12 |
| Community | Readers skim long posts | An At a glance line under every title | All |
| Community | Francophone cases had no French text | French summaries planned for Posts 2, 6, 7 and 8 | 2, 6, 7, 8 |
| Accessibility | Screenshots need alt text and a synthetic-data label | Added to the conventions and the checklist | All |
| Privacy | Replies with real data could expose individual locations | Already covered: calls to action ask for demo or anonymised data, and screenshots for Posts 3, 4 and 9 stay demo-only | 3, 4, 9 |

Still open, and listed in the checklist where they need action:

- The ratio legend breaks in Post 6 (0.8 and 1.2) are illustrative; programmes may prefer their own tolerance.

Settled since: the tracked entity layer draws case-to-contact lines across two programs (Post 4, Maps app 101.18.0 on DHIS2 2.43.2); the GPIA and denominator ratio indicators work on 2.43.2 and the demo's checks read them; the French summaries of Posts 2, 6, 7 and 8 are written.

## Sources and checks before posting

Every post links to at least one documented DHIS2 use case (first table), and every benchmark traces to a published source (second table).

| Post | Documented DHIS2 use case | Source |
| --- | --- | --- |
| 1 · Immunization | Uganda categorizes districts by RED/REC on DHIS2 data each year | [Gavi joint appraisal 2024–2025](https://www.gavi.org/news/document-library/uganda-joint-appraisal-2024-2025) |
| 2 · Malaria and climate | Uganda and Togo run the Climate App; Mozambique sends automated malaria alerts | [Uganda](https://dhis2.org/climate/country-profiles/uganda/), [Togo](https://dhis2.org/climate/country-profiles/togo/), [DAC2026](https://community.dhis2.org/t/dac2026-summary-wiki-ai-climate-health/75799) |
| 3 · Cholera | Zambia's e-IDSR cholera tracker captures case GPS (about 30% complete) | [JIEPH, 2025](https://afenet-journal.org/enhancing-disease-surveillance-zambias-cholera-tracker-2019-to-2024/) |
| 4 · Contact tracing | Ebola response in the DRC and Uganda; Africa CDC outbreak toolkit | [DHIS2 In Action](https://dhis2.org/in-action/), [DHIS2 surveillance](https://dhis2.org/disease-surveillance/) |
| 5 · Maternal access | Siaya County, Kenya: DHIS2 data with WorldPop and AccessMod | [American Journal of GIS, 2020](https://ir.jooust.ac.ke/bitstreams/011c2b3f-16d4-4379-a835-59d02a7faa86/download) |
| 6 · NTDs | Tanzania and Benin NTD data in DHIS2; Tanzania MDA reporting pilot | [ESPEN workshop 2025](https://espen.afro.who.int/sites/default/files/content/document/Data_Workshop_Report_v01.pdf), [UDSM DHIS2 Lab](https://dhis2.udsm.ac.tz/?p=2591) |
| 7 · Education | Togo's regional offices plan teacher deployment and construction | [DHIS2 for Education](https://education.dhis2.org/?p=21653) |
| 8 · Supply chain | Cameroon: logistics reporting 70% to 95%, fewer stockouts | [ASTMH poster](https://www.ghsupplychain.org/sites/default/files/2022-10/Cameroon_ASTMH_ePoster_FINAL.pdf) |
| 9 · One Health | Namibia dog vaccination records; Angola bite case tracking | [DHIS2 In Action](https://dhis2.org/in-action/), [Across Sectors](https://dhis2.org/across-sectors/) |
| 10 · Data quality | Balochistan, Pakistan: reporting 55% to 90%; Uganda roll-out | [DHIS2 In Action](https://dhis2.org/in-action/), [Uganda study, 2014](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4030005/) |
| 11 · Nutrition | Yemen CMAM tracker; Egypt screening of displaced Sudanese children | [Across Sectors](https://dhis2.org/across-sectors/) |
| 12 · Agriculture | Malawi NAMIS household food assessments; Edo State dashboards | [Malawi impact story](https://dhis2.org/malawi-climate-agriculture/), [Across Sectors](https://dhis2.org/across-sectors/) |

| Source | Supports | Posts |
| --- | --- | --- |
| [DHIS2 In Action](https://dhis2.org/in-action/) | Use-case weighting; Ebola, Namibia and Pakistan stories | Overview, 4, 9, 10 |
| [DHIS2 Across Sectors](https://dhis2.org/across-sectors/) | Non-health use cases; Yemen nutrition results | Overview, 11 |
| [Climate & Health at DAC2026](https://community.dhis2.org/t/dac2026-summary-wiki-ai-climate-health/75799) | 18 implementing countries | Overview |
| [Climate & Health phase 1 results](https://dhis2.org/achievements-wellcome-climate-health-phase-1/) | Climate App in 9,000+ instances | Overview |
| [DHIS2 vaccine logistics](https://dhis2.org/?p=25329) | 36+ countries with facility vaccine stock data | Overview |
| [DHIS2 for Education implementations](https://education.dhis2.org/implementation) | More than 10 countries | Overview |
| [Maps app climate layer announcement, January 2026](https://community.dhis2.org/t/maps-app-v105-5-is-now-available-new-climate-layer-sources/69377) | Climate and vegetation layer sources, data table values, pinned legends, continuous release for 2.40+ | 2, 10, 12 |
| [DHIS2 Maps user guide, 2.42](https://docs.dhis2.org/pt/use/user-guides/dhis-core-version-242/analysing-data/maps.html) | Layer types, timeline and split view (12 periods, split only with split), predefined legends | 1, 2, 6, 11 |
| [Tracker Use Academy: event and tracked entity layers](https://docs.dhis2.org/en/topics/training-docs/tracker-use-academy/tracker-maps-event-and-tei-layer/traineraposs-guide-to-tracker-maps-event-and-tei-layer.html) | Grouping, style by data element, buffers, relationships within one program | 3, 4 |
| [DHIS2 EPI aggregate package design](https://docs.dhis2.org/ar/implement/health/immunization/expanded-programme-on-immunization-epi-aggregate/design.html) | RED categories at 90% coverage and 10% dropout | 1 |
| [CDC MMWR, 2020](https://WWW.CDC.GOV/mmwr/volumes/70/wr/mm7043a1.htm) | Zero-dose as access, dropout as utilization | 1 |
| [Baringo County malaria study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445289) | Two-month rainfall lag | 2 |
| [Parasites & Vectors, 2019](https://link.springer.com/10.1186/s13071-019-3547-z) | Transmission peak near 25 °C | 2 |
| [BMJ Open CATI protocol, 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9260795) | 100–250 m ring, 7-day high-risk window | 3 |
| [CATI in Kribi, Cameroon](https://pmc.ncbi.nlm.nih.gov/articles/PMC9948504) | 3.4-day mean time to intervention | 3 |
| [WHO Ebola Q&A](https://www.who.int/news-room/q-a-detail/ebola-virus-disease) | 21-day contact monitoring | 4 |
| [DHIS2 TB Household Contact Investigation design](https://docs.dhis2.org/en/implement/health/tuberculosis/tb-household-contacts-investigation/design.html) | Contacts in a separate linked program | 4 |
| [Data for Impact EmONC indicator](https://www.data4impactproject.org/prh/womens-health/safe-motherhood/availability-of-functional-emergency-obstetric-and-newborn-care-facilities/) | 5 EmONC facilities incl. 1 comprehensive per 500,000; signal functions | 5 |
| [WHO ESPEN, MDA coverage](https://espen.afro.who.int/node/27591) | 65 / 75 / 80% coverage thresholds | 6 |
| [Reported vs surveyed MDA coverage, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10163531) | 64% and 72% concordance | 6 |
| [UNESCO UIS fact sheet](https://webarchive.unesco.org/web/20160711133425/http://unesdoc.unesco.org/images/0023/002351/235153E.pdf) | Parity band 0.97–1.03 | 7 |
| [DHIS2 for Education, Togo](https://education.dhis2.org/?p=21653) | Teacher deployment and construction planning in DHIS2 | 7 |
| [DHIS2 Monthly Stock Reporting package](https://docs.dhis2.org/en/implement/logistics/monthly-stock-reporting-msr.html) | Stock coverage time and categories | 8 |
| [GHSC-PSM Cameroon poster](https://www.ghsupplychain.org/sites/default/files/2022-10/Cameroon_ASTMH_ePoster_FINAL.pdf) | Zeros vs missing data | 8 |
| [Frontiers in Tropical Diseases, 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC7614337) | Zero by 30 and IBCM | 9 |
| [University of Glasgow thesis, 2023](https://theses.gla.ac.uk/83692/) | Fivefold detection gain from IBCM | 9 |
| [WHO veterinary rabies vaccines](https://www.who.int/teams/control-of-neglected-tropical-diseases/rabies/vaccinations-and-immunization/veterinary-vaccines) | 70% dog vaccination | 9 |
| [Uganda SPT data quality evaluation, 2021](https://uploads-ssl.webflow.com/61b71cb9b3bcb8b89636d4c1/61d30d996a425ab801951709_SPT%20for%20EPI%20Uganda%20evaluation%202021.pdf) | 75% DQR threshold | 10 |
| [Countdown to 2030 data quality guide](https://www.countdown2030.org/countdown-news/how-to-assess-the-quality-of-aggregated-routine-health-facility-data) | 90% reporting threshold, completeness adjustment | 10 |
| [ENN Harmonised Training Package](https://ennonline.net/sites/default/files/HTP-v2-module-12-technical-notes.pdf) | Sphere cure, death, defaulter and coverage standards | 11 |
| [ENN Field Exchange](https://ennonline.net/fex/46/considerations) | Uneven coverage; review of 104 CMAM programmes | 11 |
| [Malawi climate & health profile](https://dhis2.org/climate/country-profiles/malawi/) | Climate-informed malnutrition early warning | 11 |
| [Malawi NAMIS impact story](https://dhis2.org/malawi-climate-agriculture/) | 150,000+ households, bi-weekly food assessment | 12 |
| [FEWS NET eVIIRS NDVI](https://earlywarning.usgs.gov/fews/product/918) | NDVI anomaly against the long-term mean | 12 |
| [USDA Crop Explorer](https://ipad.fas.usda.gov/cropexplorer/Definitions/spotveg.htm) | Dry spells at flowering and grain filling | 12 |

Checks before each post goes live:

- [ ] Confirm the demo instance runs the newest v43 patch (or 2.44 if released) and the latest Maps app (v101.6.0 or later for WorldPop Global2), with a Google Earth Engine key and the climate, vegetation and population sources enabled, for Posts 2, 3, 5, 6 and 12.
- [ ] Point each Try it step to the dedicated demo instance, and open the post's saved map there to confirm its planted patterns are visible with the current dates.
- [ ] Swap generic thresholds for national ones where they differ: EPI cut-offs, pupil–teacher norm, stock min/max levels, reporting targets, crop calendar.
- [ ] Re-check the scale figures in the overview (80 countries, 18 climate countries, 36+ logistics countries) on the day you publish, since the DHIS2 pages update them.
- [ ] Before each post, contact the HISP group or ministry behind its In practice example; invite them to reply with their own map, which turns the post into a conversation.
- [ ] Check each screenshot with a colour-blindness simulator, and add alt text and the "DEMO DATA, NOT REAL" caption.
- [ ] Take screenshots from demo data only for Posts 3, 4 and 9, and have a French speaker check the French summaries of Posts 2, 6, 7 and 8.
