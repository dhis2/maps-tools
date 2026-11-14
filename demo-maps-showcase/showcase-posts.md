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
| 1 | Where are the unvaccinated? | Immunization (EPI) | Thematic layer with legend sets | Bubble map over choropleth |
| 2 | Rain today, malaria next month | Malaria / climate and health | Earth Engine climate layers | Split view, data table |
| 3 | Drawing the ring around cholera | Outbreak response (IDSR) | Event layer | Clustering, style by data element, buffers, building footprints |
| 4 | Who hasn't been seen today? | Outbreak contact tracing (filovirus, mpox) | Tracked entity layer | Follow-up indicator, new-case layer, relationships where possible |
| 5 | Two hours to a C-section | Maternal and newborn health | Facility layer | Travel-time catchments, WorldPop Global2, two-hour access indicator |
| 6 | Is 100% coverage too good to be true? | Neglected tropical diseases | Earth Engine population age groups | Legend sets with WHO thresholds, split view by year |
| 7 | Every school on the map | Education (EMIS) | Org unit layer | Group set styling, labels, org unit profile |
| 8 | Seeing stockouts before patients do | Supply chain (LMIS) | Facility-level thematic layer | Facility reference layer, data table filtering |
| 9 | One bite, two sectors | One Health (animal and human health) | Two event layers from two programs | Style by data element, thematic overlay |
| 10 | Map the data before you map the disease | HIS / data quality | Reporting rates in a thematic layer | Split view, interpretations, pinned legends |
| 11 | Watching the lean season | Nutrition (CMAM) | Timeline view | District rates with facility bubbles, data table |
| 12 | Green fields, empty granaries? | Agriculture and food security | Earth Engine vegetation indices | Rainfall against normal, landcover, bubble map |

Beyond the layers, the series shows the Maps app functions that turn a map into a decision, each where it fits the workflow best:

| Maps app function | What it does in the story | Posts |
| --- | --- | --- |
| Feature details (click a district, point or pixel) | Check one value or record without leaving the map | 2, 3, 4, 12 |
| Data table (sort, filter, highlight) | Turn the map into a ranked action list | 2, 6, 7, 8, 12 |
| Download data (GeoJSON) | Hand layer data to field teams, modellers or QGIS users | 2, 3, 6, 12 |
| Download map (PNG) | Put the map in a situation report, plan or bulletin | 3, 5, 7, 11, 12 |
| Open as chart (Data Visualizer) | See the trend behind a coloured area | 1, 8, 11 |
| Interpretations with @mentions | Record the decision and notify the people who must act | 1, 5, 8, 9, 10, 11 |
| Dashboards, pinned legends and slideshow autoplay | Bring the map to the review meeting | 1, 2, 7, 9, 10 |
| Drill down and up | Move from a red district to the facilities behind it | 1, 6 |
| Org unit profile | Open a school's or facility's key facts from the map | 5, 7 |
| Saving and sharing with user groups | Show sensitive maps only to the team that needs them | 4, 9 |
| Dashboard email push (HTML push analytics job) | Reach users who rarely log in | 10 |

Function details come from the [Maps user guide](https://docs.dhis2.org/cs/use/user-guides/dhis-core-version-240/analysing-data/maps.html) (data table, Download data, Open as chart, PNG download), the [DHIS2 2.31 release notes](https://community.dhis2.org/t/dhis-version-2-31-is-released/34292) (GeoJSON layer download) and the [Analytics Tools Academy maps guide](https://docs.dhis2.org/en/topics/training-docs/analytics-tools-academy/maps/traineraposs-guide-to-maps.html) (drill down, table filters, opening downloads in QGIS). Org unit profiles and dashboard email push need an administrator to set them up before the posts that use them.

Each post follows the same skeleton so readers know where to look:

1. **At a glance**: one line with the sector, Maps app features, data type and audience, for readers who skim.
2. **Hook**: one sentence with the question the map answers.
3. **The map**: the layers, in drawing order, with the settings that matter.
4. **How to read it**: what a pattern means and what action it points to.
5. **In the workflow**: who opens the map, when, which Maps app functions they use, and what decision comes out.
6. **Domain note**: the benchmark or threshold, with its source.
7. **In practice**: a documented country or programme using DHIS2 this way, with its source.
8. **Try it**: steps on the dedicated demo instance (see the Demo instance section) or your own instance.
9. **Your turn**: a call to share examples, limitations met and workarounds.

Attach a screenshot or the map's download (PNG) to each post, and link the saved map so readers can open it. Close each post with a link to the next one in the series. Post in the Implementation category with the maps tag, where the Maps app team has asked for use cases, and use demo or blurred data in any screenshot that shows individual cases.

**Map and publishing conventions.** Every legend set uses one colour-blind-safe palette (a ColorBrewer red–yellow–blue scheme): red for act now, orange for watch, blue for on target, purple for data checks and grey for no data. The posts say "green" for on target; render it as blue, because red and green are the pair most colour-blind readers confuse. Choropleths show rates or ratios, never raw counts; counts go in bubbles. Each screenshot gets alt text stating the map's main finding and a caption reading "Synthetic data, DHIS2 demo". Posts whose documented cases are francophone (2, 6, 7 and 8) end with a short French summary for the CoP's French-speaking members.

## Post 1 · Where are the unvaccinated? Access vs. utilization on one map

**At a glance.** Immunization (EPI) · Thematic choropleth and bubbles, legend sets, drill down, Open as chart, interpretations · Aggregate data · For EPI managers

**Hook.** A district with low coverage needs new sessions; a district with high dropout needs defaulter tracing. One map with two thematic layers tells the EPI manager which problem each district has.

**The map.**

1. **Thematic layer, choropleth:** Penta1 (DTP1) coverage under 1 year, last 12 months, district level. Use a predefined legend set: below 80% red, 80–89% orange, 90–100% green, above 100% purple ("check the denominator").
2. **Thematic layer, bubble map, on top:** Penta1-to-Penta3 dropout rate, same period and level. Legend set: below 0% grey (data check), 0–9.9% green, 10% and above red. Here bubble size encodes a rate, so keep sizes small and read the colour, not the size.
3. **Thematic layer, bubble map, optional:** estimated children who missed Penta1 (surviving infants minus Penta1 doses, built as a custom calculation), switched on when ranking Category 3 and 4 districts. A large district at 85% coverage can hold more zero-dose children than a small one at 60%.
4. Turn on labels for district names in the first layer's style tab.

**How to read it.** Fill colour shows access, bubble colour shows utilization, and together they place each district in a RED/REC category.

| Category | Penta1 coverage | Dropout | Problem | Typical response |
| --- | --- | --- | --- | --- |
| 1 | 90% or more | under 10% | None | Sustain, look for pockets inside the district |
| 2 | 90% or more | 10% or more | Utilization | Defaulter tracing, reminders, reliable session schedules |
| 3 | under 90% | under 10% | Access | Outreach, new fixed or mobile sessions, microplan review |
| 4 | under 90% | 10% or more | Both | Priority for supervision and resources |

Two patterns are data flags, not performance. Coverage above 100% usually means the target population is too low. A negative dropout means more Penta3 than Penta1 doses were recorded, which points to recording errors or children vaccinated outside their catchment.

**In the workflow.** Before the monthly review meeting, the district EPI officer opens this map from the immunization **dashboard**. Right-clicking a red district and choosing **drill down** shows which facilities drive the dropout. **Open as chart** on the dropout layer turns the same data into a monthly Penta1–Penta3 trend in Data Visualizer, which separates a one-off dip from a steady slide. The officer then writes an **interpretation** on the map naming the facilities and @mentioning their in-charges, who get a notification; the agreed fix (defaulter tracing, an extra outreach session) goes into the microplan.

**Domain note.** Children with no DTP1 dose (zero-dose children) reflect a lack of access, and DTP1-to-DTP3 dropout reflects under-use of services by children who did have access ([CDC MMWR, 2020](https://WWW.CDC.GOV/mmwr/volumes/70/wr/mm7043a1.htm)). The cut-offs above (90% coverage, 10% dropout) are the ones used in the categorization visualization of the [DHIS2 EPI aggregate package](https://docs.dhis2.org/ar/implement/health/immunization/expanded-programme-on-immunization-epi-aggregate/design.html); older AFRO RED guidance used 80% for district coverage, so state which cut-off your country uses.

**In practice.** Uganda's EPI runs this categorization on DHIS2 data every year. Its 2024–2025 Gavi joint appraisal shows the RED/REC maps, with more districts moving into Category 1 as the number of vaccinating health facilities grew from 4,313 in 2024 to 4,563 in 2025 ([Gavi joint appraisal](https://www.gavi.org/news/document-library/uganda-joint-appraisal-2024-2025)).

**Try it.** Create the two legend sets first in the Metadata Management app, which replaces the Maintenance app in v43, since the Maps app can only pick legends that already exist. If your instance has no dropout indicator, build one as a custom calculation directly in the Maps data item selector. Then: Add layer → Thematic → search "Penta" for the coverage indicator → Style: Choropleth, predefined legend. Add a second thematic layer with the dropout indicator → Style: Bubble map. Save and share the map with your EPI user group. The [Immunization Analysis app](https://docs.dhis2.org/en/use/optional-apps/immunization-analysis-app/app-version-103/immunization-analysis-app-user-manual.html) complements the map with coverage and dropout tables by district and facility.

**Your turn.** Which cut-offs does your national EPI use, and do you categorize districts, facilities or both? Reply with a screenshot of your own RED/REC map (demo or anonymised data) and your DHIS2 and Maps app versions. Tell us where you hit a limit, such as denominators you don't trust or a legend that can't show two thresholds at once, and how you worked around it.

## Post 2 · Rain today, malaria next month: climate layers next to case data

**At a glance.** Malaria, climate and health · Earth Engine climate layers, split view with synced periods, data table, Download data · Aggregate and climate data · For malaria programmes and climate focal points

**Hook.** Malaria cases in most of Africa follow rainfall with a lag of one to three months. The Maps app now puts satellite rainfall and temperature next to your HMIS data, aggregated to the same districts, without leaving DHIS2.

**The map.** Build two saved maps and place them side by side on a malaria dashboard: Earth Engine layers cannot join a split view, so the live satellite layers and the split case map stay separate. Try it below shows a one-map option on v43.

1. **Map A, "Rain":** Earth Engine layer → Precipitation → CHIRPS, monthly, for the peak rainfall month (for example July). Add a district boundary layer on top. Open the data table to read the value per district.
2. **Map A, optional second layer:** Earth Engine → Temperature → ERA5 daily mean, same month, with transparency at 50%.
3. **Map B, "Cases":** Thematic layer, confirmed malaria cases per 1,000 population, district level, period display **Split** for the rainfall month and the two months after it (July, August, September).

**How to read it.** Districts that turn dark in Map A and then darken in Map B one or two panels later are behaving as expected for climate-driven transmission. Districts that darken in Map B without heavy rain deserve a closer look: irrigation, dams, population movement, an intervention gap, or a change in testing.

Temperature explains the exceptions. Transmission is limited to roughly 16–34 °C and peaks near 25 °C, so cool highland districts can stay low even after heavy rain ([Parasites & Vectors, 2019](https://link.springer.com/10.1186/s13071-019-3547-z)). Very heavy rain can also flush breeding sites and reduce transmission.

**In the workflow.** Two to three months before the usual peak, the malaria programme reviews both maps with the meteorological agency. Clicking a district on the rainfall layer opens its monthly total, and the **data table** lists every district so they can be sorted by rainfall. Districts with heavy early rain and a history of cases one to two months later move up the list for net distribution, the timing of seasonal chemoprevention and pre-positioned stock (Post 8). **Download data** on the cases layer exports district values as GeoJSON for the modelling team, and both maps stay on the malaria **dashboard** so the decision and its evidence sit together.

**Domain note.** In a 10-year Kenyan series, rainfall two months earlier increased malaria cases across all four ecological zones, while temperature effects acted at 0–1 month lags ([Baringo County study, 2004–2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445289)). A map shows co-occurrence, not cause: interventions such as nets, spraying and seasonal chemoprevention shape the same pattern. Use confirmed cases (or test positivity) rather than suspected cases, and check reporting completeness before comparing months.

Two GIS cautions. CHIRPS has a resolution of about 5 km and ERA5-Land about 9 km ([Climate App guide](https://docs.dhis2.org/pt/implement/climate-health/climate-app-user-guide.html)), so a small chiefdom holds only a few pixels; compare districts rather than chiefdoms. A plain district mean also gives empty forest the same weight as towns, while [population-weighted aggregation](https://climate-tools.dhis2.org/guides/aggregation/population-weighting/) in DHIS2 Climate Tools weights each pixel by where people live, which is closer to the exposure that matters for health. The DHIS2 guide [Using climate data for malaria program planning](https://docs.dhis2.org/en/implement/climate-health/using-climate-data-for-malaria-program-planning.html) walks through the full workflow.

**In practice.** Uganda has installed the Climate App in its national HMIS and malaria repository, with 10 years of imported ERA5 and NASA data ([Uganda profile](https://dhis2.org/climate/country-profiles/uganda/)). Togo built a Climate Peak App that finds the peak rainfall months for each district ([Togo profile](https://dhis2.org/climate/country-profiles/togo/)), and Mozambique has deployed the CHAP modelling platform nationally with automated malaria alerts to district offices ([Climate & Health at DAC2026](https://community.dhis2.org/t/dac2026-summary-wiki-ai-climate-health/75799)).

Uganda already produces real-time malaria risk maps in DHIS2 from ERA5 and local weather-station data, alongside heat stress and air quality layers ([DHIS2 Community, Uganda story](https://community.dhis2.org/t/using-dhis2-to-link-climate-air-quality-and-health-outcomes-in-uganda-a-story-of-innovation-and-collaboration/65180)).

**Try it.** Earth Engine layers need a Google Earth Engine key on your server, and a Maps app administrator must enable each layer source. The January 2026 Maps app release added ERA5 and CHIRPS precipitation, ERA5 temperature, relative humidity, heat stress and MODIS vegetation indices at daily, weekly or monthly periods, with values by org unit in pop-ups and the data table ([release announcement](https://community.dhis2.org/t/maps-app-v105-5-is-now-available-new-climate-layer-sources/69377)), and DHIS2 v43 lists them among its new features. v43 also allows several timeline or split layers on one map with synced periods ([DHIS2 v43 overview](https://dhis2.org/releases/version-43/)). So import monthly CHIRPS rainfall with the Climate app, then add rainfall and confirmed cases as two thematic layers in Split mode: each panel shows one month of rain and cases together, and the import also gives you the series for formal lag analysis.

**Your turn.** What lag between rainfall and cases do you see in your districts, and has it changed when you time nets or seasonal chemoprevention? Share a screenshot of your climate and case maps with your Maps app version. Tell us what got in the way, such as Earth Engine access, period types that don't line up, or a lag you couldn't show on one map, and what you did instead.

## Post 3 · Drawing the ring around cholera: event layers with buffers

**At a glance.** Outbreak response (cholera) · Event layer with buffers and clustering, building footprints, Download data, Download map · Case-based data · For surveillance and WASH response teams

**Hook.** Case-area targeted interventions send a response team to the households around each new cholera case within days. The event layer turns a case line list into those rings, ready to hand to a field team.

**The map.**

1. **Thematic layer, surveillance-unit level:** suspected cholera cases in the last 7 days, from a program indicator, legend 0 grey, 1 orange, 2 or more red. Two or more suspected cases, or one RDT-positive case, in a unit within 7 days meets the GTFCC definition of a suspected outbreak ([GTFCC surveillance course, 2025](https://www.gtfcc.org/wp-content/uploads/2025/03/gtfcc-cholera-surveillance-for-health-care-authorities-module-2-slides-en.pdf)). Cases without household coordinates still count here, so the outbreak picture stays complete.
2. **Event layer, "Active rings":** the cholera or acute watery diarrhoea case program, cases with an RDT-positive or confirmed result, event date in the last 7 days. Style: view all events (not grouped), style by the outcome data element (alive or dead), buffer of 150 m.
3. **Event layer, "Recent cases":** same program and filter, days 8 to 14, grey points, no buffer. This shows where the outbreak has been without cluttering the active zone.
4. **Earth Engine layer, Building footprints:** lets the team see how many structures fall inside each ring and plan household visits.
5. **Basemap:** OSM Detailed for street names, or satellite imagery for informal settlements that OSM does not cover.

At national level, switch the case layer to **Group events** so cases cluster by area; zoom in and the clusters split into households.

**How to read it.** Each ring is a work order: households inside it get the response package. Overlapping rings mark a cluster that may need a wider, village-level response. A case outside every ring with no recent neighbours is a new focus and the highest priority. A red surveillance unit with no rings has cases but no household coordinates, so the team starts from the facility line list there.

**In the workflow.** At the morning incident management meeting, the surveillance lead opens the saved map. Clicking a case point shows its onset date and outcome in the side panel, enough to confirm it belongs in the active layer. **Download data** on the Active rings layer exports today's cases as GeoJSON for the response teams' offline navigation apps, and **Download map** saves a PNG with legend for the daily situation report. Each team leaves with its rings; tomorrow's map shows which ones were reached.

**Domain note.** CATI delivers interventions to households in a 100–250 m ring around the case household, and analyses of outbreak data support a high-risk zone of that size lasting about 7 days ([BMJ Open protocol, 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9260795)). Packages combine hygiene promotion, household water treatment, active case-finding, single-dose oral cholera vaccine and, where national policy allows, antibiotic chemoprophylaxis for close contacts. In Kribi, Cameroon, teams reached case areas a mean of 3.4 days after detection ([Bulletin of the WHO, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9948504)), so the 7-day layer filter matches the useful window.

The radius is an operational choice. Two NGOs used 150 m rings in northeast Nigeria in 2021 ([GTFCC WASH working group, 2022](https://www.gtfcc.org/wp-content/uploads/2022/01/7th-meeting-of-the-gtfcc-working-group-on-wash-2022-day-1-lantagne-handzel-kaur-ratnayake.pdf)), and teams there departed from their procedures because of incomplete line lists and high population density ([Johns Hopkins implementation study](https://hopkinshumanitarianhealth.org/research/publications/implementation-considerations-in-case-area-targeted-interventions-to-preven)). Use the building footprints layer to see how many structures a ring would hold before fixing the radius for a dense neighbourhood.

Two cautions. Rings only work if the program captures household coordinates; if every case sits on the health facility's location, fix the capture form first. Household points are personal data, so share this map only with the response team and use demo or blurred data in public posts.

**In practice.** Zambia's DHIS2-based e-IDSR added a cholera case tracker whose first stage captures the patient's GPS location, with offline capture on Android. During the 2023–2024 outbreak it recorded more than 33,980 cases, but only about 30% had GPS coordinates ([JIEPH conference abstract, 2025](https://afenet-journal.org/enhancing-disease-surveillance-zambias-cholera-tracker-2019-to-2024/)), which is exactly why the coordinate check above matters.

DHIS2 runs case-based surveillance of notifiable diseases in more than 30 countries ([DHIS2 disease surveillance](https://dhis2.org/disease-surveillance/)), so the same layers work wherever a cholera line list lives in Tracker.

**Try it.** On the demo instance, build the case program from the GTFCC template case report form, which already records the patient's place of residence ([GTFCC surveillance resources](https://www.gtfcc.org/?p=669)), and add a coordinate field for the household. Then: Add layer → Events → pick the program and stage → set a filter → Style tab → set the buffer radius and style by a data element. Use the layer's more-actions menu to download the layer data for field teams who navigate offline.

**Your turn.** What ring radius does your country use, and how do teams get household coordinates during an outbreak? Share how your response teams use the map, with demo or anonymised data only. Tell us where it broke down, such as missing GPS, poor connectivity in the field, or event layers that slowed down with thousands of cases, and how you coped.

## Post 4 · Who hasn't been seen today? Outbreak contact follow-up on the map

**At a glance.** Outbreak contact tracing · Tracked entity layers by program status, event layer, program-indicator choropleth, relationships where the design allows, sharing · Tracker data · For contact tracing supervisors and incident managers

**Hook.** Three numbers tell an Ebola response whether contact tracing works: how many contacts each case has, how many were seen in the last 24 hours, and how many new cases were already on a contact list. The Maps app shows where each of those numbers is failing.

**The map.**

1. **Thematic layer, health-area level, choropleth:** contacts seen in the last 24 hours as a share of contacts under follow-up, from a program indicator on the contact follow-up program. Legend: below 90% red, 90–95% orange, above 95% blue.
2. **Tracked entity layer, "Under follow-up":** the contact follow-up program, program status Active, small blue points at each contact's registration location.
3. **Tracked entity layer, "Completed":** the same program, program status Completed (21 days done), small grey points.
4. **Event layer, "New cases":** the case investigation stage of the case surveillance program, last 21 days, styled by classification (confirmed, probable), large symbols on top.
5. **Relationships, where the design allows:** the Maps app draws case-to-contact lines only when cases and contacts sit in the same program. The standard DHIS2 design keeps contacts in a separate follow-up program, so most responses will use the Relationship Tracing app for the network view instead.

**How to read it.** A red health area is where contacts are being missed today; it needs more tracers or transport. A new case sitting among blue points was a known contact, which is what success looks like. A new case with no blue points nearby came from outside known chains, and is the priority for investigation and active case finding. Blue points far from any case are contacts living away from their index case, so their local team needs the hand-over.

**In the workflow.** At the morning incident management meeting, the surveillance lead opens the map from the outbreak **dashboard**. The **data table** on the follow-up layer, sorted by rate, becomes the list of health areas that need extra tracers today. Clicking a contact point opens the person's details in the side panel. Each new case that lands away from blue points triggers an investigation team the same day. The saved map is **shared** only with the response team's user group, because contact locations are sensitive.

**Domain note.** In its report on the 2026 Bundibugyo Ebola outbreak in the DRC, CDC lists response targets of at least 20 contacts identified per case, daily contact follow-up above 95%, and more than 90% of new cases coming from known contacts; at the time, only 15–20% of new cases were known contacts, so most transmission ran outside known chains ([CDC MMWR, 2026](https://www.cdc.gov/mmwr/volumes/75/wr/pdfs/mm7535e1-H.pdf)). Contacts are followed for 21 days after their last exposure ([WHO Ebola Q&A](https://www.who.int/news-room/q-a-detail/ebola-virus-disease)). For tuberculosis, household contacts share the index case's location and sit in a separate program ([DHIS2 TB Household Contact Investigation design](https://docs.dhis2.org/en/implement/health/tuberculosis/tb-household-contacts-investigation/design.html)), so map the aggregate household-contact indicators instead.

**In practice.** DHIS2 was at the centre of the DRC's 2025 Ebola response: health workers located the epicentres and followed up nearly 600 contacts, and the command centre could see which contacts had not yet been visited and send teams to close the gaps ([DHIS2 impact story](https://dhis2.org/?p=24229)). HISP groups are supporting the current Ebola response in the DRC and Uganda, and HISP UiO is working with Africa CDC on a standardized surveillance toolkit ([DHIS2 In Action](https://dhis2.org/in-action/)).

This is the view DHIS2's own surveillance design describes: line lists, dashboards and maps of contacts per case, completeness of follow-up and contacts who become cases ([DHIS2 disease surveillance](https://dhis2.org/disease-surveillance/)). Responses already publish the follow-up rate daily by district; Uganda's 2022 Ebola situation reports showed 94% overall, with districts ranging from 93% to 100% ([WHO AFRO sitrep 19](https://www.afro.who.int/sites/default/files/2022-10/19%20EVD_SitRep%2319_221009_191718.pdf)), exactly the variation the choropleth makes visible.

Contact locations are sensitive and contacts face stigma. Restrict the saved map to the response team, and use the demo database for any public screenshot.

**Try it.** On the demo instance, build the follow-up rate as a program indicator on the contact follow-up program. Then: Add layer → Tracked entities → contact follow-up program → Program status Active; duplicate the layer and switch it to Completed. For the network, install the [Relationship Tracing app](https://community.dhis2.org/t/dhis2-relationship-tracing-app/39217); in a single-program design, such as the training database's Case-based Surveillance program, use the tracked entity layer's Relationships tab instead. The tracked entity layer uses the coordinate captured at registration, so make sure the form captures it.

**Your turn.** How do you see which contacts were missed today: a map, a line list or a phone call? Share a demo-data screenshot with your DHIS2 and Maps app versions. Tell us about the limits you met, such as relationships across programs not drawing on the map, contacts registered without coordinates, or a good average follow-up rate that hides a few high-risk contacts, and your workaround.

## Post 5 · Two hours to a C-section: mapping access to emergency obstetric care

**At a glance.** Maternal and newborn health · Facility layers, buffers and catchment areas, WorldPop Global2, org unit profile, Download map · Aggregate and population data · For reproductive health planners

**Hook.** About 15% of pregnant women develop a complication that needs emergency care, and the nearest facility that can actually perform a caesarean section decides whether they survive. Facility layers, buffers and a population layer show who lives out of reach.

**The map.**

1. **Earth Engine layer, Population (WorldPop Global2):** the current year, at 30% transparency, so dense settlements show as dark pixels.
2. **Facility layer, EmONC facilities:** facilities in the EmONC level group set, styled comprehensive (large red) and basic (orange), each showing its two-hour travel-time catchment, modelled in AccessMod and stored as a second geometry that the org unit selection can display. Until catchments are modelled, a 10 km buffer is a rough first screen.
3. **Thematic layer, district level:** share of the population living within two hours of a functioning EmONC facility, legend below 50% red, 50–59% orange and 60% or more blue, with values as labels.

Membership of the EmONC groups should come from signal-function data (all basic functions performed in the last three months), not from a facility's official designation; the DHIS2 EmONC toolkit collects exactly that.

**How to read it.** Dark population pixels outside every catchment are women who cannot reach emergency obstetric care within two hours: candidates for upgrading a health centre, a maternity waiting home or referral transport. Districts below 50% are the national priority. A district above 60% can still hide uncovered pockets at its edges, and the population layer shows where they are.

**In the workflow.** During annual operational planning, the reproductive health team uses this map to choose which health centres to upgrade and where to station ambulances. Clicking a facility opens its **org unit profile**, which can show staffing and signal-function data if the profile is configured for it. The team agrees a shortlist, saves the map as a PNG with **Download map** for the plan document, and records the reasoning in an **interpretation**, so next year's team can see why each site was chosen.

**Domain note.** The 2009 WHO/UNFPA/UNICEF/AMDD handbook sets a minimum of five EmONC facilities, including at least one comprehensive, per 500,000 population ([Data for Impact indicator sheet](https://www.data4impactproject.org/prh/womens-health/safe-motherhood/availability-of-functional-emergency-obstetric-and-newborn-care-facilities/)). A basic facility performs all seven basic signal functions in the last three months; a comprehensive one adds caesarean section and blood transfusion. Earlier UNFPA guidance aimed for basic care within 2 hours of travel ([Data for Impact](https://www.data4impactproject.org/?p=5662)).

Buffers are straight-line distances, not travel time. Rivers, roads and the rainy season change access completely, so treat the buffer as a first screen. For travel-time catchments, model them in WHO's AccessMod and bring the result back as catchment boundaries or facility attributes.

The current global benchmark is about travel time, not facility counts: the EPMM coverage target is for at least 60% of the population to reach emergency obstetric care within two hours of travel, with 80% of countries above 50% ([WHO, 2021](https://www.who.int/news/item/05-10-2021-new-global-targets-to-prevent-maternal-deaths); [EPMM targets](https://www.alignmnh.org/es/wp-content/uploads/2021/10/EPMM.pdf)). DHIS2 can store a catchment polygon as an extra geometry on each facility through a GeoJSON attribute ([DHIS2 release overview](https://dhis2.org/?p=9389)), and WorldPop Global2 population can be aggregated to those catchments ([WorldPop Global2 announcement](https://community.dhis2.org/t/worldpop-global-2-yearly-high-resolution-population-data-is-now-available-in-dhis2/70851)), which gives the EPMM indicator directly.

**In practice.** Togo's Ministry of Health redesigned its EmONC network in 2018 with AccessMod: the 73 prioritised facilities cover 95.5% of the population within two hours by walking and motorised transport, against 96.6% for the earlier 109-facility network ([Togo network study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8327815)), and the UNFPA and University of Geneva programme behind the method lists Sierra Leone among its countries ([UNIGE GeoHealth](https://unige.ch/geohealth)). In Siaya County, Kenya, researchers combined DHIS2 delivery data, facility coordinates from DHIS2 and the Kenya Master Health Facility List, WorldPop population and AccessMod: only 5% of pregnant women could reach a hospital within an hour on foot, rising to 25% with motorcycle transport ([American Journal of GIS, 2020](https://ir.jooust.ac.ke/bitstreams/011c2b3f-16d4-4379-a835-59d02a7faa86/download)). The DHIS2 EmONC toolkit, developed with UNFPA, adds the routine signal-function data that keeps the EmONC groups current ([EmONC design guide](https://docs.dhis2.org/en/implement/health/rmncah/emergency-obstetric-and-newborn-care/design.html)).

**Try it.** Model two-hour catchments in WHO's [AccessMod](https://www.who.int/tools/accessmod-geographic-access-to-health-care), export them as GeoJSON, and load them into a GeoJSON attribute on each facility with the GeoJSON geometry import ([DHIS2 2.39 release note](https://docs.dhis2.org/en/implement/software-release-information/dhis2-core-releases/dhis-core-version-239/release-notes.html)); import AccessMod's share of population covered per district as data values. On the demo instance, add a Facilities layer for the EmONC groups, style it by the EmONC level group set, and choose the catchment geometry in the org unit selection, or set a 10 km buffer if catchments are not loaded yet. Add the Population layer from Earth Engine underneath and pick WorldPop Global2 and the year (Maps app v101.6.0 or later; saved maps that still use the older Global1 source must be updated by hand). The [Health Facility Profile package](https://docs.dhis2.org/en/implement/health/health-facility-profile/overview.html) is a ready-made starting point for the org unit profile.

**Your turn.** Does your country keep EmONC status as an org unit group set, and how often is it updated after assessments? Share an access map from your context (facility-level only, no patient data). Tell us whether straight-line buffers were good enough or misleading, and whether you have brought AccessMod or other travel-time results back into DHIS2.

## Post 6 · Is 100% coverage too good to be true? Checking MDA denominators with satellite population

**At a glance.** Neglected tropical diseases · Split view, WorldPop Global2 age groups, data table, drill down, Download data · Aggregate and population data · For NTD programme managers

**Hook.** Districts that report 110% deworming coverage are not over-performing; their denominator is wrong. Split view shows coverage across rounds, and the Earth Engine population age-group layer gives an independent estimate of how many school-age children live there.

**The map.**

1. **Map A, thematic layer, split view:** therapeutic coverage of soil-transmitted helminth MDA among school-age children, by implementation unit, for the last three annual rounds side by side. Legend set: below 75% red, 75–100% green, above 100% purple ("check denominator").
2. **Map B, Earth Engine layer, Population age groups:** WorldPop Global2, ages 5–9 and 10–14 for both sexes, for the year of the MDA round. Open the data table to read the modelled total per implementation unit.
3. **Map B, thematic layer on top, choropleth:** the ratio of the DHIS2 school-age denominator to the WorldPop estimate, with a diverging legend, for example below 0.8 (denominator low), 0.8–1.2 (consistent) and above 1.2 (denominator high). Import the WorldPop totals as data values with the Import/Export app's Earth Engine import, then build the ratio as a plain indicator (official denominator ÷ WorldPop estimate), which needs no expression functions.

**How to read it.** In Map A, a district that is purple every year has a structural denominator problem, while one that flips between red and green may have had a missed or partial round. In Map B, a ratio well below 1 means the official denominator is smaller than the WorldPop estimate; where that unit also reports coverage above 100%, the census projection is probably too low and true coverage is lower than reported.

WorldPop is a model, not a count. Use the gap as a reason to investigate (school enrolment lists, migration, recent census), not as a replacement denominator.

**In the workflow.** Before the annual MDA application, the NTD programme reviews denominators unit by unit. The ratio layer's **data table**, sorted by ratio, is the review list: units far from 1 come first. **Drill down** on a purple district shows whether the problem sits in one sub-district. **Download data** exports the ratio layer as GeoJSON for further analysis in QGIS, and the agreed denominators go back into DHIS2 before the next round, and into the Joint Application Package the programme uses to request donated medicines from WHO.

**Domain note.** WHO classifies treatment coverage as effective at 65% for lymphatic filariasis and onchocerciasis, 75% for schistosomiasis and soil-transmitted helminthiasis, and 80% for trachoma ([WHO ESPEN](https://espen.afro.who.int/node/27591)). The population differs by disease: total population for LF and trachoma, school-age children for schistosomiasis and STH. Keep therapeutic coverage (people treated over people requiring treatment in a unit) separate from geographic coverage (units treated over units requiring treatment). A multi-country review found routinely reported and surveyed coverage concordant in 64% of estimates for the total population and 72% for school-age children ([BMJ Global Health, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10163531)), which is why coverage evaluation surveys matter.

**In practice.** At WHO ESPEN's 2025 data workshop, Tanzania reported linking NTD indicators to DHIS2 and NTD medicine tracking to its eLMIS, Benin described a dedicated NTD repository in DHIS2, and countries flagged gaps between census projections and pre-MDA headcounts as a persistent denominator problem ([ESPEN workshop report](https://espen.afro.who.int/sites/default/files/content/document/Data_Workshop_Report_v01.pdf)). Tanzania then piloted a digital MDA reporting module in its DHIS2 system in Mkinga District in November 2025 ([UDSM DHIS2 Lab](https://dhis2.udsm.ac.tz/?p=2591)).

**Try it.** Split view supports up to 12 periods and combines only with other split layers, so build the Earth Engine comparison as a second map and put both on the NTD dashboard. Create one legend set per threshold (65, 75, 80) and reuse them across diseases.

**Your turn.** Which denominator does your NTD programme use for school-age children: census projections, school enrolment, or community registers? Share a screenshot of your coverage map or denominator check. Tell us about the limits you met, such as implementation units that don't match your org unit hierarchy or WorldPop totals far from local counts, and how you reconciled them.

## Post 7 · Every school on the map: teacher deployment and gender parity in an EMIS

**At a glance.** Education (EMIS) · Org unit layer with group sets, school-level bubbles, org unit profile, Download map · School census data · For education officers

**Hook.** DHIS2 is not only for health. Education ministries use the same Maps app to decide where to post teachers and which schools to repair first, and a school-level map makes the case for moving teachers before hiring new ones.

**The map.**

1. **Org unit layer:** education district boundaries with labels, styled by an org unit group set such as urban/rural.
2. **Thematic layer, school level, bubble map:** primary pupil–teacher ratio from the annual school census. Legend relative to your national norm: at or below the norm green, up to 1.5 times the norm orange, above that red.
3. **Thematic layer, district level, choropleth:** adjusted gender parity index (GPIA) of the gross enrolment ratio. Legend: below 0.97 (girls disadvantaged), 0.97–1.03 (parity), above 1.03 (boys disadvantaged).
4. **Org unit profile:** configure it to show enrolment by sex, teachers, classrooms and latrines, so clicking any school opens its profile on the map.

**How to read it.** A red school beside green schools in the same district points to redeployment, which is faster and cheaper than recruitment. A district that is red everywhere needs new posts or new classrooms. Parity colours often flip between primary and secondary, so build one map per level; at secondary, boys are disadvantaged in some countries and girls in others.

**In the workflow.** Before each teacher posting cycle, the regional director of education opens the map from the regional **dashboard**. Clicking a red school opens its **org unit profile** with enrolment, teachers and classrooms, which is often enough to settle a posting in the meeting. The **data table** on the school layer, sorted by ratio, becomes the list sent to the human resources unit. The map itself, saved with **Download map**, goes into the school census report for district officers who rarely log in. After the next census, a split view of the two census years shows whether the redeployments worked.

**Domain note.** UNESCO treats a gender parity index between 0.97 and 1.03 as parity ([UNESCO Institute for Statistics fact sheet](https://webarchive.unesco.org/web/20160711133425/http://unesdoc.unesco.org/images/0023/002351/235153E.pdf)). Map the adjusted index (GPIA), which UNESCO built to be symmetrical around 1: when the girls' value is higher, GPIA = 2 − boys' value ÷ girls' value, so an advantage to boys and an equal advantage to girls sit the same distance from 1 ([UIS and GEM Report, 2017](https://unesdoc.unesco.org/ark:/48223/pf0000250392)). DHIS2 indicator expressions support if(), so GPIA can be built as one indicator, for example if(G > B, 2 − B/G, G/B), where G and B are the girls' and boys' gross enrolment ratios written out from enrolment and population data elements; check it in Data Visualizer before mapping. Pupil–teacher ratio norms are national, so set the legend from your own policy and consider the ratio of pupils to trained teachers as well.

**In practice.** In Togo, the StatEduc application still collects the school census, and DHIS2 turns it into dashboards, maps and tables on enrolment, teacher–pupil ratios and exam pass rates, disaggregated by gender and disability. Regional education offices now use it to deploy teachers, prioritise school construction and target furniture shortages ([DHIS2 for Education](https://education.dhis2.org/?p=21653)). Zambia runs its national Education Management Information System on DHIS2 as well ([DHIS2 user story](https://docs.dhis2.org/en/topics/user-stories/zambia-education-management-system-emis.html)), one of more than 10 countries implementing DHIS2 for Education ([implementations](https://education.dhis2.org/implementation)).

**Try it.** Install the [SDG4 Education Toolkit](https://docs.dhis2.org/en/implement/education/sdg4-education-toolkit/toolkit-overview.html) on a test instance, add schools as org units with coordinates, and set up the org unit profile so the map becomes a school directory as well as an analysis tool.

**Your turn.** If your ministry runs DHIS2 for Education, which school-level map do district officers open most? Share a screenshot and your DHIS2 version. Tell us what limited you, such as schools without coordinates or census data that arrives only once a year, and how you filled the gap.

## Post 8 · Seeing stockouts before patients do: months of stock at facility level

**At a glance.** Supply chain (LMIS) · Facility-level thematic layer, data table filters, Open as chart, interpretations · Stock reports · For district pharmacists and logistics officers

**Hook.** A district average of three months of stock can hide a facility with none next to one with ten. Mapping stock coverage facility by facility turns the monthly stock report into a redistribution list.

**The map.**

1. **Facility layer:** every health facility in the district in light grey, no buffer. This is the reference layer.
2. **Thematic layer, facility level:** months of stock (stock on hand divided by average monthly consumption) for one tracer product, such as artemether-lumefantrine or ORS/zinc, last month. Legend set using your national min/max levels, for example 0 dark red (stockout), below min orange (understock), min to max green, above max blue (overstock).
3. **Data table:** open it, sort by value, and filter to the red and blue facilities.

**How to read it.** A grey dot with no coloured dot on top did not report: that is a data problem, not a stockout. Red and blue facilities close to each other are a lateral transfer waiting to happen, before an emergency order to the warehouse. A cluster of red facilities served by the same district store points upstream to a distribution or ordering failure.

**In the workflow.** After the monthly reporting deadline, the district pharmacist filters the **data table** to the red and blue facilities and agrees transfers by phone, using the map's distance measurement to pick the nearest overstocked facility. **Open as chart** on the months-of-stock layer shows whether a red facility is a one-off or has been sliding for months. An **interpretation** on the map records the agreed transfers and @mentions the facility in-charges, so next month's map can be checked against what was promised.

**Domain note.** The DHIS2 [Monthly Stock Reporting package](https://docs.dhis2.org/en/implement/logistics/monthly-stock-reporting-msr.html) defines stock coverage time as stock on hand over average monthly demand, and groups it into stockout, understock, appropriate stock, overstock and excessive stock. Two traps matter for the map. First, if zero values are not stored, a stocked-out facility looks the same as one that never reported; a USAID GHSC-PSM team in Cameroon found exactly this and advocated making zeros visible in DHIS2 ([ASTMH poster](https://www.ghsupplychain.org/sites/default/files/2022-10/Cameroon_ASTMH_ePoster_FINAL.pdf)). Second, consumption drops during a stockout, so average consumption calculated over those months understates real demand; adjust for stockout days.

**In practice.** In Cameroon, a USAID GHSC-PSM team coached district teams to analyse malaria commodity data in DHIS2 and made stockouts distinguishable from missing reports. Logistics reporting rates rose from 70% in August 2020 to 94% in April 2021 and 95% in April 2022, and stockouts fell in both DHIS2 data and end-user verification surveys ([ASTMH poster](https://www.ghsupplychain.org/sites/default/files/2022-10/Cameroon_ASTMH_ePoster_FINAL.pdf)).

Malawi built this map into its DHIS2 logistics integration: after bringing OpenLMIS data into DHIS2, a map shows which facilities are over- and under-stocked for a product and the distance between them, to guide transfers ([DHIS2 impact story](https://dhis2.org/malawi-logistics-integration/)). In Comoros, managers using DHIS2 Real-Time Stock track shortages and overstocks across facilities, spot geographic trends and coordinate redistribution; 58 of 74 sites were using it within three months of go-live ([DHIS2 impact story](https://dhis2.org/?p=23433)).

**Try it.** Set the stock data elements to store zero values before you map them. Then: Add layer → Thematic → months-of-stock indicator → Org units: facility level → Style: Choropleth with your stock-status legend set. Save one map per tracer product and put them on a logistics dashboard.

**Your turn.** Do your districts use facility-level stock maps to plan lateral transfers, or does redistribution still go through the warehouse? Share your stock-status map and legend set. Tell us what got in the way, such as zeros not stored, late reports, or min/max levels that differ by facility level, and how you handled it.

## Post 9 · One bite, two sectors: human and animal rabies data on one map

**At a glance.** One Health (rabies) · Two event layers from two programs, thematic overlay, sharing, interpretations · Case-based and aggregate data · For human and animal health officers

**Hook.** A dog bite is recorded at a health facility; the dog that bit is investigated, if at all, by a veterinary officer. When both sectors report into DHIS2, one map shows where high-risk bites, confirmed animal cases and dog vaccination gaps overlap.

**The map.**

1. **Thematic layer, district level:** dog vaccination coverage from the last campaign (dogs vaccinated ÷ estimated dog population), legend below 70% red and 70% or above green.
2. **Event layer, "Bites":** the bite event program used for Integrated Bite Case Management, such as the DHIS2 rabies tools from GARC, last 3 months, styled by the risk assessment of the biting animal (suspect rabid, healthy, unknown). Group events at national view. Where only aggregate data exist, map bite exposures per 100,000 people from the DHIS2 human rabies package as a choropleth instead.
3. **Event layer, "Animal investigations":** the veterinary surveillance program, same period, styled by laboratory or rapid test result (positive, negative, not tested), in a different symbol colour from the bites.
4. **Basemap:** OSM Light, so the three layers stay readable.

**How to read it.** High-risk bites with no animal investigation nearby show where veterinary follow-up is missing. Confirmed animal cases with no bites reported around them suggest people are not seeking care, so check access to post-exposure prophylaxis. A cluster of both in a red district is the place to run the next dog vaccination campaign.

**In the workflow.** The joint One Health committee meets every quarter. Because the veterinary and surveillance officers belong to one user group that the saved map is **shared** with, both look at the same map on the same One Health **dashboard**. Comments go into **interpretations**, so the cross-ministry discussion stays attached to the evidence, and the committee records its decision there: which districts get the next dog vaccination campaign and where post-exposure prophylaxis stock should move.

**Domain note.** The Zero by 30 strategy to end human deaths from dog-mediated rabies by 2030 recommends Integrated Bite Case Management, where health workers assess each bite and share it with animal health officers who investigate the biting animal ([Frontiers in Tropical Diseases, 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC7614337)). In a Philippines case study, routine surveillance confirmed under 1% of circulating animal cases and IBCM increased detection fivefold ([University of Glasgow thesis, 2023](https://theses.gla.ac.uk/83692/)). WHO advises vaccinating at least 70% of the dog population in each community ([WHO](https://www.who.int/teams/control-of-neglected-tropical-diseases/rabies/vaccinations-and-immunization/veterinary-vaccines)).

The weakest number on this map is the dog population behind the coverage layer. Estimate it from household surveys or a locally measured human-to-dog ratio, and check each campaign with a post-vaccination coverage survey before trusting a green district.

**In practice.** Since 2019, Namibia's Directorate of Veterinary Services has recorded every dog vaccination, education event and confirmed animal rabies case in DHIS2 event programs built by GARC: more than 130,000 vaccinations in a single year, while human rabies deaths fell from 23 in 2015 to zero so far in 2026 ([DHIS2 impact story](https://dhis2.org/?p=28308)). In Cross River State, Nigeria, a DHIS2-based app from GARC tracks dog vaccinations, bites and human and animal rabies cases, and displays bite and case reports across the state in real time ([WHO feature story](https://www.who.int/news-room/feature-stories/detail/rabies-surveillance-in-action-saving-lives-in-cross-river-state-nigeria)). In Angola, the Ministry of Agriculture and Fisheries uses DHIS2 to monitor rabies vaccination campaigns and track animal bite cases ([DHIS2 Across Sectors](https://dhis2.org/across-sectors/)).

The hard part is not the map but the data agreement. Human and animal health usually sit in different ministries, so agree on sharing settings and who can see bite locations before building the layers.

**Try it.** Start from DHIS2's [human rabies surveillance](https://docs.dhis2.org/en/implement/health/neglected-tropical-diseases/human-rabies-surveillance-aggregate/overview.html) package (aggregate) and [animal health event-based surveillance](https://docs.dhis2.org/en/implement/health/animal-health/event-based-surveillance/overview.html) package, and add event programs for dog vaccinations and bites, such as the GARC rabies tools already used in Namibia and Nigeria. Event layers from different programs can sit on the same map, each with its own style and filter; share the bite layer only with the joint health and veterinary user group.

**Your turn.** Is your veterinary service reporting into the same DHIS2 instance as health, a separate one, or not at all? Share how you combined the two, even if only on a dashboard. Tell us about the hard parts, such as data-sharing agreements, different org unit hierarchies between ministries, or bite locations you couldn't map, and what worked.

## Post 10 · Map the data before you map the disease: reporting completeness and feedback

**At a glance.** HIS and data quality · Reporting rates, split view, interpretations with @mentions, dashboard email push, slideshow · Reporting data · For HMIS officers

**Hook.** Every map in this series assumes facilities reported. A district with half its reports missing looks like a district with low coverage, low cases or low stock. Mapping reporting rates first, then sending feedback from the map, closes the loop.

**The map.**

1. **Map A, thematic layer, split view:** reporting rate of the monthly HMIS data set by district for the last three months. Data item type: reporting rates. Legend: below 75% red, 75–89% orange, 90% and above green, with values as labels.
2. **Map B, thematic layer, facility level:** reporting rate on time for the last 6 months, so each point shows the share of months a facility reported by the deadline. Add a facility layer in grey underneath so facilities with no data at all still appear.
3. **Interpretation:** on Map B, write an interpretation that names the late facilities and @mentions the district health information officer.
4. **Dashboard:** add both maps to the district review dashboard and pin the legend so it stays visible in slideshows and printouts.

**How to read it.** A district that is green on completeness but orange on timeliness reports eventually but too late for monthly review meetings. A single red facility in a green district is a supervision visit; a whole red district is a system problem such as connectivity, staffing or devices. Before comparing any indicator across districts, check that both districts are green here.

**In the workflow.** At the monthly data review meeting, the HMIS officer projects the district **dashboard** with both maps and their **pinned legends**. Late or missing facilities are named in an **interpretation** with @mentions, which sends each in-charge a notification. Facility staff who rarely log in can receive the same dashboard by email through **dashboard email push**, the HTML push analytics job in the Scheduler app that replaced the older push analysis ([DHIS2 2.41 release note](https://dhis2.github.io/dhis2-releases/releases/2.41/ReleaseNote-2.41.html)). Between meetings, v43's slideshow autoplay can run the dashboard on a screen in the district office. Next month, the same map shows whether the follow-up worked, and the interpretation thread shows who was asked to do what.

**Domain note.** Thresholds vary by country. An evaluation applying the WHO Data Quality Review toolkit used at least 75% as the acceptable level for completeness and timeliness ([Uganda SPT evaluation, 2021](https://uploads-ssl.webflow.com/61b71cb9b3bcb8b89636d4c1/61d30d996a425ab801951709_SPT%20for%20EPI%20Uganda%20evaluation%202021.pdf)), while Countdown to 2030 treats district reporting below 90% as low and suggests adjusting service counts for incomplete reporting rather than assuming non-reporting facilities provided no services ([Countdown to 2030](https://www.countdown2030.org/countdown-news/how-to-assess-the-quality-of-aggregated-routine-health-facility-data)). Publish your national threshold in the legend name so readers know which one applies.

A reporting rate counts forms, not content: a facility that submits a nearly empty form still counts as complete ([DHIS2 data quality guide](https://docs.dhis2.org/ar/implement/data-quality/analysis.html)). Check data element completeness for the indicators that matter, and use the [WHO Data Quality Tool](https://docs.dhis2.org/en/use/optional-apps/who-data-quality-tool/usage-and-interpretation.html) app for the consistency checks recommended in WHO's [Data Quality Assurance toolkit](https://www.who.int/data/data-collection-tools/health-service-data/data-quality-assurance-dqa).

**In practice.** Health authorities in Balochistan, Pakistan, replaced paper reporting with DHIS2 and raised reporting compliance from 55% to 90% ([DHIS2 In Action](https://dhis2.org/in-action/)). Earlier, Uganda's national DHIS2 roll-out improved the timeliness and completeness of routine reporting from districts to the national level ([Uganda roll-out study, 2014](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4030005/)).

**Try it.** On play.dhis2.org: Add layer → Thematic → data item type Reporting rates → choose a data set → Split view by month. Save, then open Interpretations in the right panel to start the conversation. The Maps app is on continuous release for DHIS2 2.40 and above, so update it from the App Hub to get the newest options, such as pinned legends.

**Your turn.** Do your districts discuss reporting maps in monthly review meetings, and have interpretations replaced any of your feedback emails? Share a screenshot of your reporting map. Tell us where feedback stalls, such as interpretations nobody reads, staff without DHIS2 accounts, or completeness that looks fine while timeliness lags, and what you did about it.

## Post 11 · Watching the lean season: malnutrition admissions on a timeline

**At a glance.** Nutrition (CMAM) · Timeline view, Open as chart, facility-level bubbles, Download map · Aggregate data · For nutrition cluster coordinators

**Hook.** Acute malnutrition rises and falls with the hunger gap before harvest, and a single map cannot show a wave. The timeline view plays monthly admissions district by district, and a second map shows whether treatment sites keep up.

**The map.**

1. **Map A, thematic layer, timeline:** new admissions for severe acute malnutrition (SAM) per 1,000 children aged 6–59 months, by district, monthly for the last 12 months, period display Timeline. Use a predefined legend set so a colour means the same rate in every month.
2. **Map B, thematic layer, district level, choropleth:** cure rate among children discharged from outpatient therapeutic programme (OTP) sites in the last quarter. Legend: below 75% red, 75% and above green. A district rate avoids percentages built on a handful of children.
3. **Map B, thematic layer, facility level, bubble map:** number of children discharged from each OTP site in the same quarter, so the workload behind each district rate is visible.
4. **Map B, facility layer:** all health facilities in light grey underneath, so facilities that do not offer OTP are visible.
5. **Data table:** open it on the bubble layer to rank sites by exits, and drill into a red district to see which sites drive its rate.

**How to read it.** Map A shows when the wave starts and where it hits first; an early rise can mean a failed harvest, or simply a MUAC screening campaign that found more children. In Sierra Leone, the demo country, the lean season runs from June to August ([Cadre Harmonisé, July 2026](https://agrhymet.cilss.int/wp-content/uploads/2026/07/CH-FICHE-COMMUNICATION-JUIN-2026_english.pdf)), so the wave should build through those months. In Map B, a red district with large bubbles points to RUTF stockouts (see Post 8), overcrowding or late admission at busy sites. High-burden districts where the nearest bubble is far away, with grey facilities in between, are candidates for decentralising OTP.

**In the workflow.** The nutrition cluster meets monthly through the lean season. The coordinator plays the timeline, then uses **Open as chart** on the admissions layer to show the same months as one line per hotspot district. Map B, saved as a PNG with **Download map**, goes into the cluster bulletin. The decision (which districts get extra RUTF, mobile teams or new OTP sites) is recorded in an **interpretation** so partners can follow it up.

**Domain note.** Sphere minimum standards for SAM treatment are a cure rate above 75%, deaths below 10% and defaulting below 15%, with coverage above 50% in rural areas, 70% in urban areas and 90% in camps ([ENN Harmonised Training Package](https://ennonline.net/sites/default/files/HTP-v2-module-12-technical-notes.pdf)). Coverage needs a survey such as SQUEAC or SLEAC; admissions alone cannot give it, but survey results can be entered as an annual district data element and mapped beside admissions. Averages also hide geography: one programme with 50% average coverage was very high in half its site catchments and very low in the other half, and a review of 104 CMAM programmes found no urban or camp programme meeting its standard ([ENN Field Exchange](https://ennonline.net/fex/46/considerations)).

Policy changes move this map. The 2023 WHO guideline on wasting, which supersedes the 2013 guidance, defines severe wasting as weight-for-height below −3 z-scores and/or MUAC below 115 mm ([commentary on the guideline, 2025](https://research.dial.uclouvain.be/bitstreams/daa232b1-7bb7-4d49-9b5f-deb1b099e082/download)) and allows trained community health workers to assess and manage children with wasting ([1,000 Days summary](https://thousanddays.org/?p=14056)). When a country adopts it, admissions shift from facilities to communities: add community treatment sites to the bubble layer, and mark the change date with an interpretation so a drop in facility admissions is not misread as improvement.

**In practice.** In Yemen, DHIS2 Tracker supports community-based management of acute malnutrition, with an 8% reduction in severe acute malnutrition over two years and a 95% recovery rate. Egypt's Ministry of Health rolled out DHIS2 Tracker in 45 days to screen displaced Sudanese children and women for malnutrition ([DHIS2 Across Sectors](https://dhis2.org/across-sectors/)). Malawi and Uganda are now building climate-informed malnutrition early warning on DHIS2 ([Malawi climate profile](https://dhis2.org/climate/country-profiles/malawi/)), which links this post to Post 12.

**Try it.** Start from the [DHIS2 Nutrition aggregate package](https://docs.dhis2.org/en/implement/health/nutrition/nutrition-aggregate/design.html). Add layer → Thematic → Period: last 12 months → display periods: Timeline, then press play. Several timeline layers can share one map, and they all use the same periods.

**Your turn.** Do you treat rising admissions as an early warning, or wait for SMART survey results before scaling up? Share your timeline map, or a short screen recording of it playing. Tell us where you hit limits, such as small numbers at OTP sites or admissions inflated by screening campaigns, and how you dealt with them.

## Post 12 · Green fields, empty granaries? Vegetation, rainfall and household food security

**At a glance.** Agriculture and food security · Rainfall against the climate normal, Earth Engine vegetation and landcover, data table, Download data, Download map · Household assessments and satellite data · For agriculture planners and food security analysts

**Hook.** DHIS2 is not only a health system. Malawi's Ministry of Agriculture runs its national agriculture information system on DHIS2, and the Maps app can put satellite vegetation and rainfall next to household food security data from the same platform.

**The map.**

1. **Thematic layer, choropleth:** rainfall since the start of the season as a percentage of the 1991–2020 normal, by district, from precipitation and normal-precipitation series imported with the Climate App ([Climate App guide](https://docs.dhis2.org/pt/implement/climate-health/climate-app-user-guide.html)). Legend, for example: below 75% red, 75–90% orange, 90–110% blue, above 110% purple (flood watch).
2. **Earth Engine layer, Vegetation indices (MODIS NDVI), monthly:** a critical month of the current season: February for Malawi's November–April season, or August for Sierra Leone, where sowing runs from April to July ([FAO GIEWS](https://www.fao.org/giews/countrybrief/country.jsp?code=SLE)).
3. **The same layer again, same month of a reference year with a normal harvest:** hidden by default, so readers can toggle between this year and normal.
4. **Earth Engine layer, Landcover:** at 50% transparency, to show where cropland lies; read the vegetation layers only where cropland dominates.
5. **Thematic layer, bubble map:** number of registered households assessed as food insecure in the latest rapid household food assessment, by extension planning area or district. Bubbles carry counts; to compare areas of different size, switch to the share as a choropleth.

**How to read it.** Start with rainfall: it is the most robust signal on the map. A district that is red on rainfall, browner than its reference year over cropland, and shows a growing food-insecurity bubble is where early action belongs: targeted support, market monitoring and nutrition screening (Post 11). A district with normal rain and green cropland that still has a large bubble points to a non-climate cause, such as prices, pests or post-harvest losses.

**In the workflow.** Every two weeks, the ministry's planning unit prepares a food security bulletin. Clicking a district on each vegetation layer gives this year's and the reference year's values, and the **data table** on the bubble layer lists the number and share of food-insecure households by area. **Download data** exports that layer as GeoJSON for partners who work in QGIS, and **Download map** provides the bulletin's figure. The bulletin's targeting recommendations also go to the health sector, which ties back to nutrition screening in Post 11.

**Domain note.** Absolute NDVI means little on its own. Early warning systems compare current NDVI with the long-term average for the same period, so that negative anomalies show less vigorous vegetation than normal ([FEWS NET eVIIRS](https://earlywarning.usgs.gov/fews/product/918)). Timing matters too: dry periods during flowering and grain filling can cut yields sharply ([USDA Crop Explorer](https://ipad.fas.usda.gov/cropexplorer/Definitions/spotveg.htm)). A district average also mixes cropland with forest and grassland, so read it as a signal to investigate, not a yield estimate.

Two further checks. NDVI is an optical index, so rainy-season cloud cover adds noise; compare several months before calling a deficit. And read the map against the official food security classification: in West Africa that is the Cadre Harmonisé, which projected 1.33 million people in Sierra Leone (14.7%) in Phase 3 or worse for the June–August 2026 lean season ([Cadre Harmonisé, July 2026](https://agrhymet.cilss.int/wp-content/uploads/2026/07/CH-FICHE-COMMUNICATION-JUIN-2026_english.pdf)); elsewhere it is the IPC.

**In practice.** Malawi's National Agriculture Management Information System registers more than 150,000 households, and agricultural extension officers run a bi-weekly rapid household food assessment that, combined with climate and production data, feeds national food security planning ([DHIS2 impact story](https://dhis2.org/malawi-climate-agriculture/)). In Nigeria, Edo State links agricultural reporting in DHIS2 to geospatial dashboards ([DHIS2 Across Sectors](https://dhis2.org/across-sectors/)).

NAMIS also takes weather data from the Ministry of Agriculture's own stations through a meteorology module built for early warning ([DHIS2 impact story](https://dhis2.org/?p=9094); [DHIS2 Community abstract](https://community.dhis2.org/t/strengthening-agricultural-resilience-through-the-integration-of-early-warning-signals-in-the-malawi-national-agriculture-management-information-system-namis-for-climate-change-adaptation/58491)), and DHIS2's agriculture guidance describes overlaying vegetation indices and land cover in DHIS2 maps for exactly this analysis ([DHIS2 for Agriculture](https://dhis2.org/agriculture/)).

**Try it.** The January 2026 Maps app release added MODIS vegetation indices (NDVI and EVI) at monthly, 16-day and weekly periods ([release announcement](https://community.dhis2.org/t/maps-app-v105-5-is-now-available-new-climate-layer-sources/69377)), and they are standard from DHIS2 v43 ([DHIS2 v43 overview](https://dhis2.org/releases/version-43/)). Add the same Earth Engine source twice with different periods to compare a season with a normal year on one map. For the rainfall layer, import monthly precipitation and its 1991–2020 normal with the Climate App and divide one by the other in an indicator.

**Your turn.** Is your ministry of agriculture, or any sector outside health, already using DHIS2 maps? Share a screenshot and the decision it supports. Tell us about the limits, such as vegetation values diluted by forest, or agriculture boundaries that differ from health districts, and how you handled them.

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
- **Legend sets**, one per benchmark used in the posts, all built from the colour-blind-safe palette in the overview conventions: Penta1 coverage (RED), Penta1–Penta3 dropout, MDA coverage at 65, 75 and 80%, pupil–teacher ratio relative to the national norm, gender parity index, stock status by months of stock, reporting rate at 75 and 90%, SAM cure rate at 75%, dog vaccination at 70%, EmONC facilities per 500,000, and share of food-insecure households.
- **Non-health org units**: schools for Post 7 and agricultural reporting areas for Post 12. Run schools in a second small instance that copies the Sierra Leone boundaries, as education ministries run their own DHIS2; adding them to the health hierarchy would force every health layer to be filtered by facility groups.

### Per-post metadata and synthetic data

The last column is the point of each dataset: generate the data so that the pattern the post describes is actually on the map.

| Post | Metadata to import or create | Synthetic data to generate | Patterns the data must show |
| --- | --- | --- | --- |
| 1 · Immunization | EPI aggregate package (Penta1, Penta3 doses under 1 year), surviving-infant population; reuse demo EPI elements if present | 24 months of facility-level doses | Districts in all four RED categories; one district above 100% coverage; two facilities with negative dropout |
| 2 · Malaria and climate | Malaria HMIS package (tested, confirmed cases); climate data elements from the Climate App | 36 months of facility-level confirmed cases, generated from real CHIRPS rainfall with a 1–2 month lag plus noise | The lag is visible across districts; one district rises without rain (irrigation story) |
| 3 · Cholera | Case-based surveillance program for cholera or acute watery diarrhoea with household coordinates, RDT result and outcome | About 300 cases over 6 weeks in 2–3 chiefdoms, household points placed on building footprints | Overlapping rings in one urban cluster; one isolated new focus; about 30% of cases without coordinates, as in Zambia |
| 4 · Contact tracing | Case surveillance tracker and a separate contact follow-up tracker (the standard design) linked by a relationship type, plus a program indicator for contacts seen in the last 24 hours | About 20 cases and 300 contacts with daily follow-up events over 21 days | One health area with follow-up below 90%; two new cases that were on no contact list; some contacts completed and some living away from their index case |
| 5 · Maternal access | EmONC aggregate toolkit (signal functions), RMNCAH deliveries, EmONC level group set | 12 months of signal-function and delivery data for hospitals and health centres; group membership derived from it | AccessMod catchments stored as a GeoJSON attribute; at least one district below 50% of its population within two hours; populated pockets outside every catchment in a district above 60% |
| 6 · NTDs | NTD overarching module (people treated by age group), school-age population, imported WorldPop Global2 school-age totals and a denominator ratio indicator | Three annual MDA rounds by implementation unit | One unit above 100% every year; one missed round; a large gap between WorldPop and the official denominator in one unit |
| 7 · Education | SDG4 Education Toolkit (enrolment by sex, teachers, classrooms), school org units with coordinates | Two annual school censuses for a few hundred schools in 2–3 districts | A red school next to green schools in the same district; parity that differs between primary and secondary |
| 8 · Supply chain | Monthly Stock Reporting package for 2–3 tracer products, zero values stored | 12 months of facility stock reports | A stocked-out facility near an overstocked one; a red cluster under one district store; a few facilities not reporting |
| 9 · One Health | Animal Health event-based surveillance package, human rabies aggregate package, and event programs for dog vaccinations and bites modelled on the GARC rabies tools | 12 months of bite and animal events with coordinates; one campaign round of coverage | High-risk bites with no animal investigation nearby; positive animal cases with no bites reported; one district below 70% coverage |
| 10 · Data quality | Reuse demo data sets assigned to facilities; completeness and timeliness come from registrations | 12 months of registrations, some late and some missing | One district complete but late; one red facility inside a green district |
| 11 · Nutrition | Nutrition aggregate package (SAM admissions 6–59 months, cured, died, defaulted), OTP site group | 24 months of monthly OTP data by site | A lean-season wave that moves across districts; one site with a low cure rate and many discharges; one with very small numbers |
| 12 · Agriculture | Custom data set at chiefdom level: households assessed and households food insecure, every two weeks; precipitation and its 1991–2020 normal imported with the Climate App; vegetation and landcover come live from Earth Engine | Two seasons of household assessment data | One chiefdom below 75% of normal rainfall, browner than its reference year and with rising food insecurity; one green chiefdom with high food insecurity |

### Rules for synthetic data

- **Label everything.** Real Sierra Leone boundaries with invented outbreaks can be mistaken for real events, especially for cholera and Ebola-like scenarios. Put "Synthetic data" in every map title, dashboard name and screenshot caption.
- **Generate, never derive.** Names, IDs and ages come from a generator, not from any real register, and household points are placed on random buildings inside the right chiefdom.
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
| GIS | Red–green legends are unreadable for the most common colour blindness | One colour-blind-safe palette for every legend set, "green" rendered as blue, simulator check added to the checklist | All |
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

- Whether the tracked entity layer can draw relationships across programs (Post 4). The post no longer depends on it, but confirming it would let the standard two-program design show case–contact lines.
- The GPIA and denominator ratio indicators rely on indicator expressions that should be tested on v43 before publishing.
- The ratio legend breaks in Post 6 (0.8 and 1.2) are illustrative; programmes may prefer their own tolerance.
- The French summaries still need writing.

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
- [ ] Test the relationships-within-one-program limitation in Post 4 on a current release; the training material that describes it may predate recent Maps app versions.
- [ ] Build and test the GPIA indicator (Post 7) and the denominator ratio indicator (Post 6) on v43 before those posts go live.
- [ ] Point each Try it step to the dedicated demo instance, and open the post's saved map there to confirm its planted patterns are visible with the current dates.
- [ ] Swap generic thresholds for national ones where they differ: EPI cut-offs, pupil–teacher norm, stock min/max levels, reporting targets, crop calendar.
- [ ] Re-check the scale figures in the overview (80 countries, 18 climate countries, 36+ logistics countries) on the day you publish, since the DHIS2 pages update them.
- [ ] Before each post, contact the HISP group or ministry behind its In practice example; invite them to reply with their own map, which turns the post into a conversation.
- [ ] Check each screenshot with a colour-blindness simulator, and add alt text and the "Synthetic data, DHIS2 demo" caption.
- [ ] Take screenshots from demo data only for Posts 3, 4 and 9, and write the French summaries for Posts 2, 6, 7 and 8.
