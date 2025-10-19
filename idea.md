## Motivation 

Create a Unified Conversation-based Portal that will aid in the process of job search by making it easier to set up, as it will be in a conversational manner, leading to an automatic process of application and tracking of applications, which could be in the form of mail updates or Discord account updates. 

## Prerequisites

    1. Figure out how the ATS system works.
        a. How are resumes scored on this ATS system?
        b. Does this vary from company to company?
        c. How to increase said score without having to force the user to upskill (as this would be counter-productive)? Can a creatively and accurately presented resume get a good ATS score?
        d. Market scouting to understand the proper setup to maximize the ATS score for said role or desired position for the user.

    2. Understand how portals like Wellfound/FlexJobs, etc. work. How are the listings presented there? Is it by the volition of said company looking to hire? Can I bypass this need to automatically scrape said information from respective companies' sites?

    3. Understanding details regarding all currently popular job application portals. Which sites will allow automated applications? Should the scale of the product start from these easy-to-apply job portals, or do I go down the rabbit hole of scraping through interests of the user's companies to keep tabs on said interest and apply if anything comes up?

    4. Understanding what a conversation should even represent in this aspect. Should I give the ability to create new conversational threads? Do I keep creation of profile thread (singular, if no new profile wants to be created, i.e., one profile one chat)? Do I allow the creation of new conversational threads, assuming they just want to be able to see the jobs posted according to the filters they selected themselves, embedded on the UI itself?

## All Initial Moving Pieces 

    1. A Conversational Flow — to let the user interact with the system in a seamless way, with multi-language support.
    
    2. Attachment of files and subsequent downloads (.pdf) for resumes and cover letters.

    3. User preference understanding —
        a. The type of job a user could be looking for (remote, in-office, contractor, consultant, etc.)
        b. The culture the user is looking for (stage of the company: early-stage startup, mid-sized company, big company, etc.)
        c. The job role(s) the user is most interested in, and other ones the user is willing to work as.
        d. Non-negotiables (from the company) according to the user.
        e. Personality traits to figure out the cultural fit with hiring companies.

    4. Web search

    5. Mode of communication with the user.
        a. Is the connection to the user's LinkedIn possible?
        b. Let the user log in to their existing accounts on selected job portals, or create a new one in case of no existing profile.
        c. If creation of a new profile, enable maximum prefill with resume and initial conversational inputs. If some details are too ambiguous to be filled by the application, revert back to the user.

## Elements in the Conversation Flow 

    1. Ability to insert the initial resume they prepared.
    2. Leading into a complete ATS-based score check and analysis.
    3. Complete breakdown of the above analysis so the user understands what is lacking and what the next steps could be.
    4. History and session management.
    5. In-context memory and reference management.
    6. Maneuverable web search (do I make it in such a way that the user can open the browser which information has been cited from on the application itself, to prevent having to go to a different site? Or is it too much engineering effort for the pilot phase?)
    7. Job role suggestion based on AI analysis of resume and web search.
    8. Compensation quotation suggestion based on resume and skill analysis.

## Backend Functionality 

    1. Job application filling automation for all selected sites by the user.
    2. Updates post application
        a. Application submission success.
        b. Application progress.
        c. Application rejection/acceptance.
        d. Interview setup date, if acceptance.
        e. If interview is set up, mark in the calendar of the user to ensure a basic email/in-app notification isn't forgotten.
    3. Metrics?
    4. Application submission failure, leading to fallback, should apply again.

## Frontend Functionality

    1. A cohesive, easy-on-the-eyes UI with subtle colors and an understated yet stylish font (Avenir-like)
    2. Accessibility buttons
        a. Attach Resume
        b. Create Profile (initiates a new conversation if user wants to create a new profile by ditching the existing one)
        c. Edit Profile (change details regarding the existing profile; will lead to a new conversational interface where the user will be given a rundown of what exists, then they can select what to edit and do as required)
        d. Export Resume and Cover Letter feature
    3. A walkthrough-style initial application setup run-through, the first conversation ever, like a guide.