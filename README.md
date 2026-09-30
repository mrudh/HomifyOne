## Project title: HomifyOne: An AI-Powered Personalisation and Workflow Management Platform for New-Build Residential Developments

### Project description: 
HomifyOne is a centralised, role-based web application that modernises the selection of standard finishes (choices), paid upgrades (extras) and procurement process for new build residential developments. The digitalisation of the UK new build home personalisation process remains largely superficial. Existing tools offer basic catalogue browsing but lack intelligent preference-driven support, thus leaving home buyers to make unaided financial decisions and forcing developers to manage multi-party workflows manually. HomifyOne replaces this disconnected experience by bringing Buyers, Developers, Suppliers, and Administrators together in a single application. It empowers buyers with AI-tailored recommendations to support better home personalisation decisions, while streamlining developer workflows, supplier coordination, and administrative governance across the platform. Unlike existing applications in this domain, HomifyOne consolidates every stakeholder's journey into one cohesive, intelligent platform focused on delivering a better home personalisation experience for the buyer. The technical challenges include developing an NLP-driven recommendation pipeline, orchestrating a multi-role, event-driven approval workflow, and integrating multiple AI capabilities into a unified buyer experience that no existing new build platform currently offers.  

### Tech Stack:
React.js, Node.js, Express.js, MongoDB, AWS S3, Python FastAPI, Pydantic, REST APIs, Sentence-transformer models, vector embeddings, AI Integration, Gemini API, RAG Concepts, Vitest, React Testing Library, Jest, Playwright, Supertest

### List of requirements (objectives): 

Essential:
- Multi-role secure authentication for Buyer, Developer, Supplier, and Admin using JWT and bcrypt password hashing 
- Role based access control and dashboards 
- Admin management of user accounts and product catalogue 
- Buyer personalised plot dashboard showing property details, selection status and deadline countdown 
- Room-by-room choices portal to browse and select standard choices for Buyers 
- Buyer lifestyle questionnaire and AI recommendation engine for extras selection 
- Dynamic live pricing engine that recalculates the total extras cost as selections are added, removed or changed 
- Developer sets deadline for Buyer selection, reviews, approves/rejects Buyer’s submission 
- Automated purchase order generation and grouping by supplier 
- Supplier restricted PO portal where they can view, acknowledge POs, update status and set ETA 
- Supplier invoice upload against assigned purchase orders 
- Developer PO and invoice management dashboard 
- In-app notifications for key workflow events 

Desirable:
- Real-time in-app messaging for relevant user communication using WebSocket connections via Socket.io 
- Calendar synchronisation for scheduled Buyer-Developer meetings and Buyer selection deadlines 
- Supplier ETA synchronisation to Developer's Calendar 
- Developer interactive map displaying all assigned development location pins with a drill-down panel listing plots, buyers, and their selection status  
- Standard choices comparator for Buyers 
- AI Buyer assistant for product selection and conversational guidance 
- PDF selection summary generated on approval, downloadable by Buyer and Developer 

Optional:
- AI invoice summariser to extract key information from uploaded supplier invoices 
- AI warning system for missing choices and inconsistent selections for Buyers 
- Supplier invoice history and payment status dashboard showing all submitted invoices with paid/pending status updated by the Developer 
- Admin analytics dashboard providing platform-wide visibility into buyer progress, product trends, supplier performance through real-time data visualisations 
- Email notifications for all key workflow events as a fallback to in-app notifications for all user roles 


