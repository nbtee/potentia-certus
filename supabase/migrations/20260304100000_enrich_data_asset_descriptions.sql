-- Enrich data asset descriptions with plain-speak explanations
-- Each description follows: what it counts → where data comes from → how to interpret

-- ============================================================================
-- Pipeline & Revenue Assets
-- ============================================================================

UPDATE data_assets SET description = 'Counts candidate profiles submitted to clients for specific job openings. Sourced from submission status changes in Bullhorn. This is a key delivery metric — a healthy submittal count means your pipeline is active. If submittals are low relative to candidate calls, you may need to improve screening quality.'
WHERE asset_key = 'submittal_count';

UPDATE data_assets SET description = 'Counts successful placements (candidates who accepted offers and started work). Sourced from placement records in Bullhorn. This is the ultimate lagging indicator — it reflects work done 4-8 weeks earlier. Compare against your monthly target to gauge performance.'
WHERE asset_key = 'placement_count';

UPDATE data_assets SET description = 'Counts new job orders (open roles) received from clients during the selected period. Sourced from job order records in Bullhorn. New jobs are a leading indicator of future placements. A growing job count means your sales pipeline is healthy.'
WHERE asset_key = 'job_order_count';

UPDATE data_assets SET description = 'Counts strategic referrals — instances where a candidate activity is linked to a job order, indicating a targeted candidate-to-role match. Automatically detected from activity records. Higher referral counts suggest consultants are actively matching candidates to specific opportunities rather than doing generic outreach.'
WHERE asset_key = 'strategic_referral_count';

UPDATE data_assets SET description = 'Total fee revenue from permanent placements. Calculated from the agreed fee amount on each permanent placement record. This is direct, one-time revenue earned when a permanent candidate starts their role.'
WHERE asset_key = 'placement_revenue_perm';

UPDATE data_assets SET description = 'Estimated revenue from contract placements. Calculated as gross profit per hour multiplied by estimated working hours over the contract duration. This represents ongoing margin earned throughout the contract period.'
WHERE asset_key = 'placement_revenue_contract';

UPDATE data_assets SET description = 'Combined revenue across permanent fees and contract margins, normalized with a multiplier so both types can be compared fairly. Use this to see total business impact regardless of placement type.'
WHERE asset_key = 'blended_revenue';

UPDATE data_assets SET description = 'Shows what percentage of your target you have achieved in the current period. Compares your actual metric value against the target set by your manager. 100% means you have hit your target; below 75% may need attention.'
WHERE asset_key = 'target_attainment';

UPDATE data_assets SET description = 'Percentage of submittals that progress to a client interview. Calculated by dividing interview count by submittal count. A low rate (below 30%) may indicate poor candidate-role matching or weak CV presentation. A high rate suggests strong screening quality.'
WHERE asset_key = 'conversion_rate_submittal_to_interview';

UPDATE data_assets SET description = 'Percentage of interviews that result in a job offer. Calculated by dividing offer count by interview count. This reflects how well candidates perform in interviews and how well-matched they are to the role requirements.'
WHERE asset_key = 'conversion_rate_interview_to_offer';

UPDATE data_assets SET description = 'Percentage of offers that convert to placements (accepted offers). Calculated by dividing placement count by offer count. A low rate may indicate issues with offer competitiveness, candidate counter-offers, or notice period complications.'
WHERE asset_key = 'conversion_rate_offer_to_placement';

UPDATE data_assets SET description = 'Counts all candidate interviews scheduled during the selected period. Sourced from interview status changes in Bullhorn submission history. Interviews are a mid-funnel indicator — they show that your submittals are being taken seriously by clients.'
WHERE asset_key = 'interview_count';

UPDATE data_assets SET description = 'Counts job offers extended to candidates during the selected period. Sourced from offer status changes in Bullhorn submission history. Offers are a late-funnel indicator — they show your candidates are strong enough to win roles.'
WHERE asset_key = 'offer_count';

UPDATE data_assets SET description = 'Ranks consultants by their total blended revenue (permanent fees plus normalized contract margins). Use this to see who is generating the most business impact across all placement types.'
WHERE asset_key = 'leaderboard_revenue';

UPDATE data_assets SET description = 'Ranks consultants by their total number of successful placements. Use this to see who is closing the most deals, regardless of deal size.'
WHERE asset_key = 'leaderboard_placements';

-- ============================================================================
-- Activity Assets
-- ============================================================================

UPDATE data_assets SET description = 'Counts business development calls to prospective clients — outreach to companies you do not currently work with. Sourced from BD Call activity records in Bullhorn. This is a leading sales indicator. Consistent BD calling builds your client pipeline over time.'
WHERE asset_key = 'bd_call_count';

UPDATE data_assets SET description = 'Counts account development and account management calls to existing clients. Sourced from AD Call and AM Call activity records in Bullhorn. These calls nurture current relationships and uncover new job requirements from clients you already work with.'
WHERE asset_key = 'ad_call_count';

UPDATE data_assets SET description = 'Counts business development meetings with prospective clients. Sourced from BD Meeting activity records in Bullhorn. Face-to-face meetings have a higher conversion rate than calls and indicate strong sales momentum.'
WHERE asset_key = 'bd_meeting_count';

UPDATE data_assets SET description = 'Counts all client-facing meetings including BD meetings and coffee catch-ups with clients. Sourced from BD Meeting and Coffee Catch Up - Client activity records. In-person client interactions build deeper relationships and often lead to exclusive job orders.'
WHERE asset_key = 'client_meeting_count';

UPDATE data_assets SET description = 'Counts all candidate phone calls including connects, follow-ups, screening calls, and headhunt calls. Sourced from multiple candidate-related activity types in Bullhorn. High candidate call volume is essential for maintaining an active talent pipeline.'
WHERE asset_key = 'candidate_call_count';

UPDATE data_assets SET description = 'Counts face-to-face meetings with candidates including coffee catch-ups and consultant interviews. Sourced from candidate meeting activity records in Bullhorn. In-person candidate meetings improve screening quality and build stronger candidate relationships.'
WHERE asset_key = 'candidate_meeting_count';

UPDATE data_assets SET description = 'Counts post-interview feedback calls with candidates after client interviews. Sourced from Interview Feedback activity records in Bullhorn. Timely feedback calls improve candidate experience and help manage expectations during the offer process.'
WHERE asset_key = 'interview_feedback_count';

UPDATE data_assets SET description = 'Counts reference check calls made for candidates progressing toward placement. Sourced from Reference Check Call activity records in Bullhorn. Reference checks are a late-stage delivery activity that indicates candidates are close to placement.'
WHERE asset_key = 'reference_check_count';

UPDATE data_assets SET description = 'Counts email-based outreach to candidates and clients including job board updates. Sourced from email activity records in Bullhorn. Email outreach complements phone-based activities and helps maintain contact with a larger audience.'
WHERE asset_key = 'email_outreach_count';

UPDATE data_assets SET description = 'Counts LinkedIn InMail messages sent to candidates and clients. Sourced from LinkedIn InMail activity records in Bullhorn. InMail is particularly effective for reaching passive candidates who are not actively job-seeking.'
WHERE asset_key = 'linkedin_inmail_count';

UPDATE data_assets SET description = 'Counts text message outreach to candidates. Sourced from SMS activity records in Bullhorn. SMS outreach can have higher response rates than email for time-sensitive communications like interview confirmations.'
WHERE asset_key = 'sms_outreach_count';

UPDATE data_assets SET description = 'Counts follow-up calls with candidates who have been placed, checking on their satisfaction and retention. Sourced from post-placement check-in activity records in Bullhorn. These calls help prevent early attrition and build long-term candidate loyalty.'
WHERE asset_key = 'post_placement_checkin_count';

UPDATE data_assets SET description = 'Total count of all logged activities across every type. Provides an overall view of consultant effort and engagement level. Compare against specific activity breakdowns to understand where time is being spent.'
WHERE asset_key = 'total_activity_count';

UPDATE data_assets SET description = 'Total client-facing activities combining BD calls, AD/AM calls, and client meetings. This aggregated view shows overall sales effort without distinguishing between new business and account management.'
WHERE asset_key = 'client_touch_count';

UPDATE data_assets SET description = 'Total candidate-facing activities combining all candidate calls and candidate meetings. This aggregated view shows overall delivery effort spent engaging with candidates across the recruitment process.'
WHERE asset_key = 'candidate_touch_count';

UPDATE data_assets SET description = 'All client-facing calls including BD (new business), AD (account development), and AM (account management) calls combined. Use this to see total phone-based client outreach regardless of whether the client is new or existing.'
WHERE asset_key = 'client_call_count';

UPDATE data_assets SET description = 'Counts first-round interviews where a candidate meets the client for the first time. Sourced from first interview status changes in Bullhorn submission history. First interviews are a critical conversion point — they validate that your submittal quality is strong enough to get candidates in front of hiring managers.'
WHERE asset_key = 'first_interview_count';

-- ============================================================================
-- Matrix & Funnel Assets
-- ============================================================================

UPDATE data_assets SET description = 'A grid showing activity counts for each consultant across each activity type. Rows are consultants, columns are activity types, and cell intensity shows volume. Use this to spot consultants who are strong in some areas but underperforming in others, or to identify team-wide gaps in specific activity types.'
WHERE asset_key = 'activity_heatmap';

UPDATE data_assets SET description = 'Tracks candidate submissions through the pipeline stages from submittal to placement. Shows how many candidates are at each stage, helping identify where candidates are dropping off and where the funnel needs attention.'
WHERE asset_key = 'submission_funnel';
