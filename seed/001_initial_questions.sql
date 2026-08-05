INSERT OR IGNORE INTO interview_questions (
  id, slug, question, excerpt, short_answer, expert_answer, speaking_blueprint,
  common_mistakes, follow_up_questions, role, level, category, technology,
  question_type, status, quality_score, fingerprint, source, generated_by, published_at
) VALUES
(
  'q-playwright-flaky-tests',
  'reduce-flaky-playwright-tests',
  'How do you reduce flaky tests in a Playwright test suite?',
  'A senior-level approach to diagnosing timing, state, data, and environment instability instead of hiding failures with retries.',
  'I first classify the flake by evidence: timing, shared state, test data, environment, or product instability. Then I reproduce it repeatedly, remove arbitrary waits, use resilient locators and web-first assertions, isolate data, and fix the underlying synchronization point. Retries remain a temporary signal, not the solution.',
  'First, I measure where and how the test fails instead of immediately increasing retries. I use traces, screenshots, video, network logs, and repeated execution to determine whether the issue is caused by the test, the environment, or the product.\n\nNext, I remove unstable patterns such as fixed sleeps, brittle CSS selectors, shared accounts, and assumptions about test order. In Playwright I prefer role or test-id locators, web-first assertions, explicit API-based test data setup, and independent browser contexts.\n\nThen, I examine infrastructure and application behavior. Slow services, eventual consistency, animations, background jobs, and non-deterministic data can all create failures that look like test defects. I work with developers to expose reliable readiness signals where necessary.\n\nFinally, I track flaky tests as engineering debt. I quarantine only when the suite must remain usable, assign ownership, set an expiry date, and monitor the flake rate until the cause is removed.',
  '[The Hook]\nI treat flaky tests as missing information, not as random noise. My first goal is to identify whether the instability belongs to the test, the environment, or the product.\n\n[The Core Execution]\nI reproduce the failure, inspect Playwright traces and network activity, replace fixed waits with observable conditions, strengthen locators, isolate test data, and remove shared state. I use retries only to collect evidence while the root cause is being fixed.\n\n[The Punchline]\nA healthy suite is not one that turns green after retries. It is one where a failure gives the team a trustworthy signal and has a clear owner.',
  '["Adding more retries without investigation","Using fixed waits such as waitForTimeout","Sharing mutable users or data between tests","Treating product race conditions as test-only problems","Quarantining a test without an owner or expiry date"]',
  '["Which Playwright artifacts do you enable in CI?","When would you quarantine a test?","How do you measure flakiness over time?"]',
  'Automation QA','Senior','Web Automation','Playwright','technical','published',95,
  'reduce flaky tests playwright suite','Curated seed','human-curated',CURRENT_TIMESTAMP
),
(
  'q-api-strategy',
  'design-api-testing-strategy',
  'How would you design an API testing strategy for a new service?',
  'Build confidence through contract, behavior, integration, security-relevant, and operational checks without duplicating every test at every layer.',
  'I start from the service risks and consumers, then define a test pyramid covering schema and contract checks, focused functional scenarios, integration boundaries, negative behavior, and a small number of end-to-end flows. I keep most tests fast and deterministic, control test data, and include observability and production verification in the strategy.',
  'I begin by understanding the API purpose, critical consumers, data sensitivity, dependencies, and failure impact. That determines what deserves deeper coverage and what can be validated with lightweight checks.\n\nAt the lowest layer, I expect developers to cover domain rules with unit tests. At the service boundary, I add contract and schema validation, authentication and authorization behavior when relevant, input validation, status codes, idempotency, pagination, rate limits, and error responses.\n\nFor integrations, I separate tests that use reliable stubs from a smaller set that exercise real downstream systems. I create deterministic test data through APIs or fixtures and avoid depending on execution order.\n\nFinally, I define CI gates, environment health checks, production smoke tests, and useful logs or correlation IDs. The strategy is successful when failures are actionable and the suite remains fast enough to run consistently.',
  '[The Hook]\nI design API testing around risk and system boundaries, not around trying every possible request combination.\n\n[The Core Execution]\nI cover business rules at unit level, contracts and behavior at the service boundary, critical integrations with controlled dependencies, and only a few end-to-end journeys. I also validate negative cases, data setup, observability, and CI execution time.\n\n[The Punchline]\nThe goal is a layered suite that catches defects close to their source and still gives confidence that the service works in the real system.',
  '["Testing only happy paths","Duplicating the same scenarios at every layer","Depending on shared test data","Ignoring contracts used by downstream consumers","Creating a suite too slow for normal CI"]',
  '["How do you test asynchronous APIs?","What would you mock?","How do you test idempotency?"]',
  'Automation QA','Senior','API Testing',NULL,'system-design','published',94,
  'design api testing strategy new service','Curated seed','human-curated',CURRENT_TIMESTAMP
),
(
  'q-release-risk',
  'assess-release-risk',
  'How do you assess whether a software release is ready to ship?',
  'A practical release decision combines evidence, known risk, blast radius, rollback capability, and stakeholder alignment rather than relying on a simple pass percentage.',
  'I assess release readiness by reviewing critical user journeys, unresolved defects, change scope, affected systems, test evidence, monitoring, rollback readiness, and business timing. I make the remaining risk explicit and recommend ship, ship with controls, or hold based on impact and recoverability.',
  'I start with the release objective and change surface. A small copy change and a payment architecture migration require different evidence and approval thresholds.\n\nNext, I review results for critical paths, regression scope, production-like validation, accessibility or localization where relevant, and open defects. I distinguish between test completion and actual confidence, because a high pass rate can still hide untested high-risk areas.\n\nThen, I examine operational readiness: feature flags, observability, alerting, rollback or roll-forward plans, support awareness, data migration safeguards, and ownership during deployment.\n\nFinally, I communicate a clear recommendation with residual risks and controls. The decision may be ship, ship gradually, ship behind a flag, or delay. My role is to make the trade-off visible rather than pretending quality is risk-free.',
  '[The Hook]\nI do not reduce release readiness to whether the test cases passed. I evaluate the remaining business and technical risk.\n\n[The Core Execution]\nI look at critical journey coverage, change complexity, open defects, environment confidence, monitoring, rollout controls, and rollback readiness. I then describe the residual risk in business terms and propose safeguards such as a feature flag or staged rollout.\n\n[The Punchline]\nA strong release recommendation is evidence-based, explicit about uncertainty, and paired with a recovery plan.',
  '["Using pass rate as the only signal","Treating every defect as equally important","Ignoring rollback and monitoring readiness","Reporting risk without a recommendation","Failing to identify the owner during rollout"]',
  '["When would you block a release?","How do feature flags change your decision?","How do you communicate risk to executives?"]',
  'QA Lead','Senior','Release Readiness',NULL,'leadership','published',96,
  'assess software release ready ship','Curated seed','human-curated',CURRENT_TIMESTAMP
),
(
  'q-bug-report',
  'write-actionable-bug-report',
  'What makes a bug report actionable for developers?',
  'An actionable report gives a developer enough evidence to reproduce, understand impact, identify the affected build, and begin investigation without unnecessary back-and-forth.',
  'A strong bug report has a precise title, environment and build, minimal reproducible steps, expected and actual behavior, frequency, impact, and useful evidence such as logs, screenshots, video, request IDs, or test data. It avoids assumptions and separates observed facts from suspected causes.',
  'I optimize a bug report for the next engineering action. The title states the failing behavior and context instead of using vague labels such as feature broken.\n\nThe report identifies the build, environment, account or data conditions, and the shortest reliable reproduction path. Expected behavior should be tied to a requirement, design, established pattern, or clearly stated user expectation.\n\nI include frequency and impact because they help prioritization. Evidence should be relevant rather than excessive: console errors, API responses, timestamps, correlation IDs, screenshots, or a short video can reduce investigation time.\n\nI also distinguish facts from hypotheses. Suggesting a likely component can help, but presenting an unverified cause as fact can send the investigation in the wrong direction.',
  '[The Hook]\nI write bug reports so a developer can move from reading to investigating with minimal clarification.\n\n[The Core Execution]\nI include a specific title, affected build and environment, minimal steps, expected versus actual behavior, frequency, user impact, and focused evidence such as logs or request IDs. I separate what I observed from what I suspect.\n\n[The Punchline]\nThe quality of a bug report is measured by how quickly the team can reproduce, prioritize, and act on it.',
  '["Using vague titles","Including long exploratory steps instead of a minimal path","Omitting build or environment information","Attaching evidence without explaining its relevance","Stating a suspected root cause as confirmed"]',
  '["How do you report an intermittent issue?","What if you cannot reproduce it?","How do you choose severity?"]',
  'Manual QA','Mid','Test Execution',NULL,'practical','published',91,
  'bug report actionable developers','Curated seed','human-curated',CURRENT_TIMESTAMP
),
(
  'q-loc-vietnamese',
  'test-vietnamese-localization',
  'How would you test Vietnamese localization for a mobile application?',
  'Vietnamese localization QA requires linguistic accuracy, context, diacritics, layout, input behavior, formatting, and real-device validation rather than simple string comparison.',
  'I combine linguistic and functional testing. I verify meaning, tone, terminology, diacritics, placeholders, plural or quantity behavior, truncation, input methods, dates, numbers, currency, search, notifications, and deep links on real devices. I also test fallback behavior and provide screenshots with context for every issue.',
  'I begin with the product audience, style guide, glossary, and supported Vietnamese variants. Accurate translation is not enough if the wording is unnatural, inconsistent, or inappropriate for the product tone.\n\nI test strings in context on representative Android and iOS devices. Vietnamese text can expose truncation, line wrapping, font rendering, missing diacritics, uppercase behavior, and button or navigation layout issues.\n\nFunctional localization checks include Vietnamese keyboard input, names and addresses, search with and without diacritics when expected, date and time formats, decimal and currency display, notifications, email content, links, and server-driven strings.\n\nFor defects, I capture the source string, localized string, screen context, recommended correction, and whether the issue is linguistic, functional, or visual. This helps the correct owner act quickly.',
  '[The Hook]\nI treat Vietnamese localization as both a language and product-quality problem.\n\n[The Core Execution]\nI validate terminology, tone, grammar, diacritics, and meaning in context, then test layout, keyboard input, formats, search behavior, notifications, and server-delivered content on real devices. I classify defects clearly and include a recommended correction when appropriate.\n\n[The Punchline]\nThe release is ready when Vietnamese users can complete the same journeys naturally and confidently, not merely when every string has been translated.',
  '["Reviewing strings only in a spreadsheet","Ignoring tone and product context","Testing on one screen size","Missing server-driven or notification content","Reporting a language issue without a suggested correction"]',
  '["How do you manage terminology consistency?","How do you test text expansion?","What is the difference between linguistic and functional localization defects?"]',
  'Localization QA','Senior','Localization Testing','Mobile','practical','published',95,
  'test vietnamese localization mobile application','Curated seed','human-curated',CURRENT_TIMESTAMP
),
(
  'q-automation-selection',
  'choose-tests-to-automate',
  'How do you decide which test cases should be automated?',
  'Automation selection should consider repeatability, business risk, execution frequency, stability, data setup, maintenance cost, and feedback value.',
  'I automate tests that provide repeated, reliable value: critical regression paths, high-volume checks, deterministic rules, and scenarios needed frequently in CI. I avoid automating unstable or short-lived behavior until the product and expected outcome are clear. The decision includes total maintenance cost, not only initial scripting effort.',
  'I begin with the outcome the team needs. Automation may support fast pull-request feedback, release regression, cross-browser coverage, data validation, or production monitoring, and each purpose leads to different priorities.\n\nGood candidates are high-risk, frequently executed, deterministic, and expensive to repeat manually. Examples include authentication, payments, core API contracts, permissions, and stable business rules.\n\nPoor early candidates include rapidly changing UI, subjective visual judgment, one-time migrations, and scenarios with uncontrolled third-party dependencies. These may become suitable later when the interface stabilizes or a lower test layer is available.\n\nI also estimate maintenance. A test that takes one hour to automate but consumes many hours of debugging every month may have negative value. I review the portfolio regularly and remove tests that no longer protect meaningful risk.',
  '[The Hook]\nI do not automate a test simply because it can be automated. I automate when repeated feedback is worth the ownership cost.\n\n[The Core Execution]\nI prioritize critical, frequent, deterministic scenarios and choose the lowest practical test layer. I consider data setup, environment reliability, expected product change, and ongoing maintenance before estimating return.\n\n[The Punchline]\nThe best automation portfolio is not the largest one. It is the one that gives fast, trusted feedback on the risks the team cares about.',
  '["Automating every manual test case","Choosing only easy scenarios instead of important ones","Ignoring maintenance and data costs","Automating unstable requirements too early","Keeping obsolete tests because they already exist"]',
  '["What would you automate first in a new product?","How do you measure automation value?","When should a test be deleted?"]',
  'Automation QA','Mid','Automation Strategy',NULL,'strategy','published',93,
  'decide test cases automate','Curated seed','human-curated',CURRENT_TIMESTAMP
);
