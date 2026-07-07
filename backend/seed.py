"""
Database seed script for Excellenta GRC.
Populates the full ExcelCyber Capability Model hierarchy.
Run: python seed.py
"""

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.models import Organization, User, UserRole, Domain, Capability, SubCapability, ChecklistItem, ChecklistStatus
from app.core.security import get_password_hash


# ─── Data ───────────────────────────────────────────────────────────────────

DOMAINS = [
    {
        "name": "Govern, Risk & Assure",
        "slug": "govern-risk-assure",
        "description": "Strategic governance, risk management, compliance, and assurance capabilities that form the foundation of a robust cybersecurity program.",
        "display_order": 1,
        "accent_color": "#0d9488",
        "icon_name": "governance",
        "capabilities": [
            {
                "name": "Strategy & Program",
                "slug": "strategy-program",
                "description": "Define and maintain cybersecurity strategy, program roadmap, operating model, and board reporting.",
                "display_order": 1,
                "sub_capabilities": [
                    {"name": "Vision & Strategy", "slug": "vision-strategy", "description": "Define the long-term cybersecurity vision and strategic objectives aligned to business goals.", "display_order": 1},
                    {"name": "Programme Roadmap", "slug": "programme-roadmap", "description": "Develop and maintain a multi-year programme roadmap with prioritised initiatives.", "display_order": 2},
                    {"name": "Operating Model", "slug": "operating-model", "description": "Define the cybersecurity operating model including RACI, team structure, and service delivery.", "display_order": 3},
                    {"name": "Board Reporting", "slug": "board-reporting", "description": "Provide structured board-level reporting on cybersecurity posture, risks, and program status.", "display_order": 4},
                ],
            },
            {
                "name": "Risk Management",
                "slug": "risk-management",
                "description": "Identify, assess, and manage cybersecurity risks across the enterprise.",
                "display_order": 2,
                "sub_capabilities": [
                    {"name": "Cyber Risk Register", "slug": "cyber-risk-register", "description": "Maintain a comprehensive register of identified cybersecurity risks with ownership and treatment plans.", "display_order": 1},
                    {"name": "Risk Appetite & Tolerance", "slug": "risk-appetite-tolerance", "description": "Define and communicate risk appetite and tolerance thresholds for cybersecurity.", "display_order": 2},
                    {"name": "Risk Quantification", "slug": "risk-quantification", "description": "Apply quantitative risk analysis methods (FAIR, VaR) to measure cyber risk in financial terms.", "display_order": 3},
                    {"name": "Threat Scenario Analysis", "slug": "threat-scenario-analysis", "description": "Conduct structured threat scenario analysis and stress testing.", "display_order": 4},
                ],
            },
            {
                "name": "Compliance",
                "slug": "compliance",
                "description": "Manage regulatory compliance obligations across applicable frameworks and jurisdictions.",
                "display_order": 3,
                "sub_capabilities": [
                    {"name": "Regulatory Mapping", "slug": "regulatory-mapping", "description": "Map regulatory requirements to controls and capabilities.", "display_order": 1},
                    {"name": "Control Framework", "slug": "control-framework", "description": "Establish and maintain a unified control framework mapping to multiple standards.", "display_order": 2},
                    {"name": "Compliance Monitoring", "slug": "compliance-monitoring", "description": "Continuously monitor compliance posture against regulatory obligations.", "display_order": 3},
                    {"name": "Regulatory Reporting", "slug": "regulatory-reporting", "description": "Prepare and submit required regulatory reports and attestations.", "display_order": 4},
                ],
            },
            {
                "name": "Audit & Assurance",
                "slug": "audit-assurance",
                "description": "Manage internal and external audit processes and continuous controls assurance.",
                "display_order": 4,
                "sub_capabilities": [
                    {"name": "Internal Audit Liaison", "slug": "internal-audit-liaison", "description": "Coordinate with internal audit on cybersecurity-related audit engagements.", "display_order": 1},
                    {"name": "External Audit Support", "slug": "external-audit-support", "description": "Support external auditors and regulatory examiners during assessments.", "display_order": 2},
                    {"name": "Control Testing", "slug": "control-testing", "description": "Design and execute control testing programmes.", "display_order": 3},
                    {"name": "Continuous Controls Monitoring", "slug": "continuous-controls-monitoring", "description": "Implement automated continuous controls monitoring where feasible.", "display_order": 4},
                ],
            },
            {
                "name": "AI Governance",
                "slug": "ai-governance",
                "description": "Govern the ethical and secure use of artificial intelligence across the organisation.",
                "display_order": 5,
                "sub_capabilities": [
                    {"name": "AI Policy & Standards", "slug": "ai-policy-standards", "description": "Develop AI governance policies and standards.", "display_order": 1},
                    {"name": "AI Risk Management", "slug": "ai-risk-management", "description": "Identify and manage risks specific to AI systems.", "display_order": 2},
                    {"name": "AI Inventory / BoM", "slug": "ai-inventory-bom", "description": "Maintain an inventory of AI systems and AI bills of materials.", "display_order": 3},
                    {"name": "Regulatory Alignment", "slug": "ai-regulatory-alignment", "description": "Align AI governance with emerging AI regulations (EU AI Act, etc.).", "display_order": 4},
                ],
            },
            {
                "name": "Privacy Program",
                "slug": "privacy-program",
                "description": "Manage privacy obligations and data subject rights across jurisdictions.",
                "display_order": 6,
                "sub_capabilities": [
                    {"name": "Privacy Governance", "slug": "privacy-governance", "description": "Establish privacy governance structure and accountability.", "display_order": 1},
                    {"name": "DPIAs / PIAs", "slug": "dpia-pia", "description": "Conduct Data Protection Impact Assessments and Privacy Impact Assessments.", "display_order": 2},
                    {"name": "Consent Management", "slug": "consent-management", "description": "Manage user consent for data processing activities.", "display_order": 3},
                    {"name": "Cross-Border Transfers", "slug": "cross-border-transfers", "description": "Manage cross-border data transfer compliance (SCCs, BCRs, adequacy decisions).", "display_order": 4},
                ],
            },
            {
                "name": "3rd Party & Supply Chain",
                "slug": "third-party-supply-chain",
                "description": "Assess and manage cybersecurity risks across third-party relationships and supply chain.",
                "display_order": 7,
                "sub_capabilities": [
                    {"name": "Vendor Risk Management", "slug": "vendor-risk-management", "description": "Assess and monitor vendor cybersecurity risk.", "display_order": 1},
                    {"name": "SaaS Posture Governance", "slug": "saas-posture-governance", "description": "Govern SaaS application security posture.", "display_order": 2},
                    {"name": "SBOM / Software Risk", "slug": "sbom-software-risk", "description": "Manage software bill of materials and software supply chain risk.", "display_order": 3},
                    {"name": "Concentration Risk", "slug": "concentration-risk", "description": "Identify and mitigate vendor concentration risk.", "display_order": 4},
                ],
            },
            {
                "name": "Cyber Insurance",
                "slug": "cyber-insurance",
                "description": "Manage cyber insurance strategy, evidence, claims, and controls alignment.",
                "display_order": 8,
                "sub_capabilities": [
                    {"name": "Policy Strategy", "slug": "policy-strategy", "description": "Develop cyber insurance policy strategy and coverage approach.", "display_order": 1},
                    {"name": "Underwriter Evidence", "slug": "underwriter-evidence", "description": "Prepare and maintain evidence for underwriter submissions.", "display_order": 2},
                    {"name": "Claims Management", "slug": "claims-management", "description": "Process and manage cyber insurance claims.", "display_order": 3},
                    {"name": "Insurance-Grade Controls", "slug": "insurance-grade-controls", "description": "Maintain controls to meet insurance underwriting requirements.", "display_order": 4},
                ],
            },
            {
                "name": "Human Risk & Awareness",
                "slug": "human-risk-awareness",
                "description": "Build security culture and manage human-centric risk through awareness and training.",
                "display_order": 9,
                "sub_capabilities": [
                    {"name": "Security Culture Programme", "slug": "security-culture-programme", "description": "Develop and measure security culture across the organisation.", "display_order": 1},
                    {"name": "Phishing Simulation", "slug": "phishing-simulation", "description": "Conduct phishing simulation exercises.", "display_order": 2},
                    {"name": "Role-Based Training", "slug": "role-based-training", "description": "Deliver role-specific cybersecurity training.", "display_order": 3},
                    {"name": "Behaviour Analytics", "slug": "behaviour-analytics", "description": "Analyse user behaviour to identify risky patterns.", "display_order": 4},
                ],
            },
            {
                "name": "Policies & Standards",
                "slug": "policies-standards",
                "description": "Develop, maintain, and communicate cybersecurity policies and standards.",
                "display_order": 10,
                "sub_capabilities": [
                    {"name": "Policy Framework", "slug": "policy-framework", "description": "Establish a structured policy framework with tiered policies, standards, and procedures.", "display_order": 1},
                    {"name": "Standards Lifecycle", "slug": "standards-lifecycle", "description": "Manage the lifecycle of cybersecurity standards from creation to retirement.", "display_order": 2},
                    {"name": "Exception Management", "slug": "exception-management", "description": "Process and track policy exceptions with approval workflows.", "display_order": 3},
                    {"name": "Policy Awareness", "slug": "policy-awareness", "description": "Ensure policy awareness and acknowledgement across the workforce.", "display_order": 4},
                ],
            },
            {
                "name": "Metrics & Reporting",
                "slug": "metrics-reporting",
                "description": "Define, measure, and report cybersecurity metrics and key risk indicators.",
                "display_order": 11,
                "sub_capabilities": [
                    {"name": "KRIs / KPIs", "slug": "kris-kpis", "description": "Define and track key risk indicators and key performance indicators.", "display_order": 1},
                    {"name": "Executive Dashboards", "slug": "executive-dashboards", "description": "Build executive dashboards for cybersecurity posture visibility.", "display_order": 2},
                    {"name": "Regulator Reporting", "slug": "regulator-reporting", "description": "Prepare regulatory reports on cybersecurity metrics.", "display_order": 3},
                    {"name": "Benchmarking", "slug": "benchmarking", "description": "Benchmark cybersecurity maturity against industry peers and standards.", "display_order": 4},
                ],
            },
        ],
    },
    {
        "name": "Protect & Defend",
        "slug": "protect-defend",
        "description": "Technical security capabilities to protect enterprise assets and defend against cyber threats.",
        "display_order": 2,
        "accent_color": "#0891b2",
        "icon_name": "shield",
        "capabilities": [
            {
                "name": "Zero Trust Architecture", "slug": "zero-trust-architecture", "description": "Implement zero trust architecture principles across the enterprise.", "display_order": 1,
                "sub_capabilities": [
                    {"name": "ZTNA", "slug": "ztna", "description": "Deploy Zero Trust Network Access for secure application access.", "display_order": 1},
                    {"name": "Microsegmentation", "slug": "microsegmentation", "description": "Implement microsegmentation to limit lateral movement.", "display_order": 2},
                    {"name": "Policy Decision & Enforcement", "slug": "policy-decision-enforcement", "description": "Centralise policy decision and enforcement points.", "display_order": 3},
                    {"name": "Continuous Verification", "slug": "continuous-verification", "description": "Verify identity and trust continuously for every access request.", "display_order": 4},
                ],
            },
            {
                "name": "Cloud Security", "slug": "cloud-security", "description": "Secure cloud infrastructure, workloads, and identities.", "display_order": 2,
                "sub_capabilities": [
                    {"name": "CSPM", "slug": "cspm", "description": "Cloud Security Posture Management for continuous compliance.", "display_order": 1},
                    {"name": "CWPP", "slug": "cwpp", "description": "Cloud Workload Protection Platform for workload security.", "display_order": 2},
                    {"name": "CIEM", "slug": "ciem", "description": "Cloud Infrastructure Entitlement Management for identity security.", "display_order": 3},
                    {"name": "SaaS Security Posture (SSPM)", "slug": "saas-security-posture", "description": "Manage SaaS application security posture.", "display_order": 4},
                ],
            },
            {
                "name": "Endpoint & Mobile", "slug": "endpoint-mobile", "description": "Secure endpoints and mobile devices against threats.", "display_order": 3,
                "sub_capabilities": [
                    {"name": "EDR / XDR Endpoint", "slug": "edr-xdr-endpoint", "description": "Endpoint detection and response capabilities.", "display_order": 1},
                    {"name": "Mobile Device Management", "slug": "mobile-device-management", "description": "Manage and secure mobile devices.", "display_order": 2},
                    {"name": "Endpoint Hardening", "slug": "endpoint-hardening", "description": "Harden endpoints against compromise.", "display_order": 3},
                    {"name": "Patch & Update Management", "slug": "patch-update-management", "description": "Manage patching and updates across endpoints.", "display_order": 4},
                ],
            },
            {
                "name": "Network & Perimeter", "slug": "network-perimeter", "description": "Secure network infrastructure and perimeter defences.", "display_order": 4,
                "sub_capabilities": [
                    {"name": "SASE / SSE", "slug": "sase-sse", "description": "Secure Access Service Edge and Security Service Edge.", "display_order": 1},
                    {"name": "Email Security", "slug": "email-security", "description": "Protect against email-borne threats.", "display_order": 2},
                    {"name": "DNS / Web Filtering", "slug": "dns-web-filtering", "description": "DNS security and web content filtering.", "display_order": 3},
                    {"name": "DDoS Protection", "slug": "ddos-protection", "description": "Protect against distributed denial of service attacks.", "display_order": 4},
                ],
            },
            {
                "name": "Wireless Security", "slug": "wireless-security", "description": "Secure wireless network infrastructure.", "display_order": 5,
                "sub_capabilities": [
                    {"name": "Corporate Wi-Fi", "slug": "corporate-wifi", "description": "Secure corporate Wi-Fi networks.", "display_order": 1},
                    {"name": "Guest Network", "slug": "guest-network", "description": "Secure guest network access.", "display_order": 2},
                    {"name": "Rogue AP Detection", "slug": "rogue-ap-detection", "description": "Detect and remediate rogue access points.", "display_order": 3},
                    {"name": "IoT-on-Wi-Fi", "slug": "iot-wifi", "description": "Secure IoT devices on wireless networks.", "display_order": 4},
                ],
            },
            {
                "name": "App & Product Security", "slug": "app-product-security", "description": "Secure applications throughout the development lifecycle.", "display_order": 6,
                "sub_capabilities": [
                    {"name": "DevSecOps", "slug": "devsecops", "description": "Integrate security into DevOps pipelines.", "display_order": 1},
                    {"name": "SAST / DAST / IAST", "slug": "sast-dast-iast", "description": "Static, dynamic, and interactive application security testing.", "display_order": 2},
                    {"name": "SCA", "slug": "sca", "description": "Software Composition Analysis for open source risk.", "display_order": 3},
                    {"name": "API Security", "slug": "api-security", "description": "Secure API endpoints and communications.", "display_order": 4},
                ],
            },
            {
                "name": "Configuration Hardening", "slug": "configuration-hardening", "description": "Harden system configurations against threats.", "display_order": 7,
                "sub_capabilities": [
                    {"name": "Secure Baselines", "slug": "secure-baselines", "description": "Define and enforce secure configuration baselines.", "display_order": 1},
                    {"name": "Drift Detection", "slug": "drift-detection", "description": "Detect configuration drift from baselines.", "display_order": 2},
                    {"name": "Golden Images", "slug": "golden-images", "description": "Maintain hardened golden images for deployment.", "display_order": 3},
                    {"name": "IaC Security", "slug": "iac-security", "description": "Secure Infrastructure as Code templates.", "display_order": 4},
                ],
            },
            {
                "name": "Vulnerability Management", "slug": "vulnerability-management", "description": "Identify, prioritise, and remediate vulnerabilities.", "display_order": 8,
                "sub_capabilities": [
                    {"name": "Vulnerability Scanning", "slug": "vulnerability-scanning", "description": "Regular vulnerability scanning across assets.", "display_order": 1},
                    {"name": "CTEM", "slug": "ctem", "description": "Continuous Threat Exposure Management.", "display_order": 2},
                    {"name": "Attack Surface Management", "slug": "attack-surface-management", "description": "Manage external attack surface.", "display_order": 3},
                    {"name": "Penetration / Red Teaming", "slug": "penetration-red-teaming", "description": "Conduct penetration tests and red team exercises.", "display_order": 4},
                ],
            },
            {
                "name": "Software Supply Chain Ops", "slug": "software-supply-chain-ops", "description": "Secure the software supply chain pipeline.", "display_order": 9,
                "sub_capabilities": [
                    {"name": "SBOM Management", "slug": "sbom-management", "description": "Manage software bills of materials.", "display_order": 1},
                    {"name": "Build Pipeline Integrity", "slug": "build-pipeline-integrity", "description": "Secure CI/CD build pipelines.", "display_order": 2},
                    {"name": "Dependency Scanning Ops", "slug": "dependency-scanning-ops", "description": "Scan dependencies for known vulnerabilities.", "display_order": 3},
                    {"name": "Artifact Signing", "slug": "artifact-signing", "description": "Sign software artifacts for integrity verification.", "display_order": 4},
                ],
            },
            {
                "name": "Cryptographic Operations", "slug": "cryptographic-operations", "description": "Manage cryptographic assets and operations.", "display_order": 10,
                "sub_capabilities": [
                    {"name": "Cryptographic Inventory", "slug": "cryptographic-inventory", "description": "Maintain inventory of cryptographic assets.", "display_order": 1},
                    {"name": "PKI / Certificate Ops", "slug": "pki-certificate-ops", "description": "Manage PKI and certificate lifecycle.", "display_order": 2},
                    {"name": "Key & Secrets Management", "slug": "key-secrets-management", "description": "Manage cryptographic keys and secrets.", "display_order": 3},
                    {"name": "Post-Quantum Migration", "slug": "post-quantum-migration", "description": "Plan and execute migration to post-quantum cryptography.", "display_order": 4},
                ],
            },
            {
                "name": "Detection & Response", "slug": "detection-response", "description": "Detect and respond to cybersecurity incidents.", "display_order": 11,
                "sub_capabilities": [
                    {"name": "SIEM / Log Analytics", "slug": "siem-log-analytics", "description": "Security information and event management.", "display_order": 1},
                    {"name": "XDR / SOAR", "slug": "xdr-soar", "description": "Extended detection and response with SOAR automation.", "display_order": 2},
                    {"name": "Threat Hunting", "slug": "threat-hunting", "description": "Proactive threat hunting across the enterprise.", "display_order": 3},
                    {"name": "MDR / Managed Detection", "slug": "mdr-managed-detection", "description": "Managed detection and response services.", "display_order": 4},
                ],
            },
            {
                "name": "Threat Intelligence", "slug": "threat-intelligence", "description": "Gather and operationalise threat intelligence.", "display_order": 12,
                "sub_capabilities": [
                    {"name": "Strategic CTI", "slug": "strategic-cti", "description": "Strategic cyber threat intelligence for leadership.", "display_order": 1},
                    {"name": "Tactical / Technical CTI", "slug": "tactical-technical-cti", "description": "Tactical and technical threat intelligence.", "display_order": 2},
                    {"name": "Brand / Executive Protection", "slug": "brand-executive-protection", "description": "Monitor for brand and executive threats.", "display_order": 3},
                    {"name": "Deception Technology", "slug": "deception-technology", "description": "Deploy deception technology for threat detection.", "display_order": 4},
                ],
            },
            {
                "name": "Fraud & Transactional", "slug": "fraud-transactional", "description": "Detect and prevent fraud in transactions.", "display_order": 13,
                "sub_capabilities": [
                    {"name": "Real-Time Monitoring", "slug": "real-time-monitoring", "description": "Real-time fraud monitoring for transactions.", "display_order": 1},
                    {"name": "Fraud Rules / ML Models", "slug": "fraud-rules-ml-models", "description": "Develop fraud detection rules and ML models.", "display_order": 2},
                    {"name": "FICA / AML Alignment", "slug": "fica-aml-alignment", "description": "Align fraud detection with FICA and AML requirements.", "display_order": 3},
                    {"name": "Fraud Case Management", "slug": "fraud-case-management", "description": "Manage fraud investigation cases.", "display_order": 4},
                ],
            },
            {
                "name": "Forensics & DFIR", "slug": "forensics-dfir", "description": "Digital forensics and incident response capabilities.", "display_order": 14,
                "sub_capabilities": [
                    {"name": "Digital Forensics", "slug": "digital-forensics", "description": "Conduct digital forensic investigations.", "display_order": 1},
                    {"name": "Incident Response", "slug": "incident-response", "description": "Manage incident response lifecycle.", "display_order": 2},
                    {"name": "Insider Threat", "slug": "insider-threat", "description": "Detect and respond to insider threats.", "display_order": 3},
                    {"name": "Evidence Handling", "slug": "evidence-handling", "description": "Proper evidence handling and chain of custody.", "display_order": 4},
                ],
            },
            {
                "name": "Agentic AI Security Ops", "slug": "agentic-ai-security-ops", "description": "Operational security for AI agents and autonomous systems.", "display_order": 15,
                "sub_capabilities": [
                    {"name": "AI-Assisted Triage", "slug": "ai-assisted-triage", "description": "Use AI to assist with alert triage.", "display_order": 1},
                    {"name": "Autonomous Response", "slug": "autonomous-response", "description": "Automated response actions for known threats.", "display_order": 2},
                    {"name": "Agent Governance", "slug": "agent-governance", "description": "Govern the behaviour of autonomous security agents.", "display_order": 3},
                    {"name": "Human-in-the-Loop", "slug": "human-in-the-loop", "description": "Maintain human oversight for critical response actions.", "display_order": 4},
                ],
            },
            {
                "name": "Logging & Telemetry", "slug": "logging-telemetry", "description": "Manage logging and telemetry infrastructure.", "display_order": 16,
                "sub_capabilities": [
                    {"name": "Source Coverage", "slug": "source-coverage", "description": "Ensure comprehensive log source coverage.", "display_order": 1},
                    {"name": "Retention & Archival", "slug": "retention-archival", "description": "Manage log retention and archival.", "display_order": 2},
                    {"name": "Pipeline Integrity", "slug": "pipeline-integrity", "description": "Maintain log pipeline integrity.", "display_order": 3},
                    {"name": "Cost & Scale", "slug": "cost-scale", "description": "Manage logging costs at scale.", "display_order": 4},
                ],
            },
            {
                "name": "Cyber Resilience", "slug": "cyber-resilience", "description": "Build cyber resilience through backup, recovery, and testing.", "display_order": 17,
                "sub_capabilities": [
                    {"name": "Immutable Backups", "slug": "immutable-backups", "description": "Maintain immutable backups for recovery.", "display_order": 1},
                    {"name": "Recovery Testing", "slug": "recovery-testing", "description": "Regularly test recovery procedures.", "display_order": 2},
                    {"name": "Incident Response Plan", "slug": "incident-response-plan", "description": "Develop and maintain incident response plans.", "display_order": 3},
                    {"name": "Tabletop Exercises", "slug": "tabletop-exercises", "description": "Conduct tabletop exercise scenarios.", "display_order": 4},
                ],
            },
            {
                "name": "Service Continuity", "slug": "service-continuity", "description": "Ensure business continuity and disaster recovery.", "display_order": 18,
                "sub_capabilities": [
                    {"name": "Business Continuity", "slug": "business-continuity", "description": "Maintain business continuity plans.", "display_order": 1},
                    {"name": "Disaster Recovery", "slug": "disaster-recovery", "description": "Maintain disaster recovery plans.", "display_order": 2},
                    {"name": "Crisis Management", "slug": "crisis-management", "description": "Manage crisis response and communications.", "display_order": 3},
                    {"name": "Third-Party Continuity", "slug": "third-party-continuity", "description": "Assess third-party business continuity.", "display_order": 4},
                ],
            },
            {
                "name": "Availability & Capacity", "slug": "availability-capacity", "description": "Manage system availability and capacity planning.", "display_order": 19,
                "sub_capabilities": [
                    {"name": "Performance Monitoring", "slug": "performance-monitoring", "description": "Monitor system performance.", "display_order": 1},
                    {"name": "Capacity Planning", "slug": "capacity-planning", "description": "Plan capacity for security infrastructure.", "display_order": 2},
                    {"name": "Resource Exhaustion Defence", "slug": "resource-exhaustion-defence", "description": "Defend against resource exhaustion attacks.", "display_order": 3},
                    {"name": "Service Health Reporting", "slug": "service-health-reporting", "description": "Report on security service health.", "display_order": 4},
                ],
            },
            {
                "name": "OT / IoT / Smart Building", "slug": "ot-iot-smart-building", "description": "Securing operational technology, IoT, and smart building systems.", "display_order": 20,
                "sub_capabilities": [
                    {"name": "OT Asset Visibility", "slug": "ot-asset-visibility", "description": "Gain visibility into OT assets.", "display_order": 1},
                    {"name": "IT/OT Segmentation", "slug": "it-ot-segmentation", "description": "Segment IT and OT networks.", "display_order": 2},
                    {"name": "Smart Building Security", "slug": "smart-building-security", "description": "Secure smart building systems.", "display_order": 3},
                    {"name": "IoT Lifecycle", "slug": "iot-lifecycle", "description": "Manage IoT device lifecycle security.", "display_order": 4},
                ],
            },
            {
                "name": "Physical & Environmental", "slug": "physical-environmental", "description": "Manage physical and environmental security controls.", "display_order": 21,
                "sub_capabilities": [
                    {"name": "Facility Access Control", "slug": "facility-access-control", "description": "Control physical access to facilities.", "display_order": 1},
                    {"name": "Environmental Controls", "slug": "environmental-controls", "description": "Monitor environmental controls.", "display_order": 2},
                    {"name": "Clean Desk / Secure Print", "slug": "clean-desk-secure-print", "description": "Enforce clean desk and secure print policies.", "display_order": 3},
                    {"name": "Secure Disposal", "slug": "secure-disposal", "description": "Securely dispose of sensitive assets.", "display_order": 4},
                ],
            },
            {
                "name": "Asset Management", "slug": "asset-management", "description": "Manage hardware and software asset inventory.", "display_order": 22,
                "sub_capabilities": [
                    {"name": "Hardware Inventory", "slug": "hardware-inventory", "description": "Maintain hardware asset inventory.", "display_order": 1},
                    {"name": "Software Inventory", "slug": "software-inventory", "description": "Maintain software asset inventory.", "display_order": 2},
                    {"name": "Shadow IT Discovery", "slug": "shadow-it-discovery", "description": "Discover shadow IT assets.", "display_order": 3},
                    {"name": "Lifecycle Management", "slug": "lifecycle-management", "description": "Manage asset lifecycle from procurement to disposal.", "display_order": 4},
                ],
            },
        ],
    },
    {
        "name": "Identity & Data",
        "slug": "identity-data",
        "description": "Identity and access management combined with data security, protection, and privacy capabilities.",
        "display_order": 3,
        "accent_color": "#7c3aed",
        "icon_name": "identity",
        "capabilities": [
            {
                "name": "Workforce Identity", "slug": "workforce-identity", "description": "Manage workforce identity and access.", "display_order": 1,
                "sub_capabilities": [
                    {"name": "SSO / MFA", "slug": "sso-mfa", "description": "Single sign-on and multi-factor authentication.", "display_order": 1},
                    {"name": "Identity Governance (IGA)", "slug": "identity-governance-iga", "description": "Identity governance and administration.", "display_order": 2},
                    {"name": "Privileged Access (PAM)", "slug": "privileged-access-pam", "description": "Privileged access management.", "display_order": 3},
                    {"name": "Identity Threat Detection (ITDR)", "slug": "identity-threat-detection-itdr", "description": "Identity threat detection and response.", "display_order": 4},
                ],
            },
            {
                "name": "Customer Identity (CIAM)", "slug": "customer-identity-ciam", "description": "Manage customer identity and access.", "display_order": 2,
                "sub_capabilities": [
                    {"name": "Customer Authentication", "slug": "customer-authentication", "description": "Customer authentication mechanisms.", "display_order": 1},
                    {"name": "Fraud / Abuse Detection", "slug": "fraud-abuse-detection", "description": "Detect fraud and abuse in customer access.", "display_order": 2},
                    {"name": "Consent & Preferences", "slug": "consent-preferences", "description": "Manage customer consent and preferences.", "display_order": 3},
                    {"name": "Federated / Social Login", "slug": "federated-social-login", "description": "Federated and social login options.", "display_order": 4},
                ],
            },
            {
                "name": "Non-Human Identity", "slug": "non-human-identity", "description": "Manage non-human identity and secrets.", "display_order": 3,
                "sub_capabilities": [
                    {"name": "Service Account Governance", "slug": "service-account-governance", "description": "Govern service account usage.", "display_order": 1},
                    {"name": "Secrets Management", "slug": "secrets-management", "description": "Manage secrets for applications and services.", "display_order": 2},
                    {"name": "API Key / Token Lifecycle", "slug": "api-key-token-lifecycle", "description": "Manage API key and token lifecycle.", "display_order": 3},
                    {"name": "Workload Identity", "slug": "workload-identity", "description": "Manage workload identities.", "display_order": 4},
                ],
            },
            {
                "name": "Data Discovery & Posture", "slug": "data-discovery-posture", "description": "Discover and classify data assets.", "display_order": 4,
                "sub_capabilities": [
                    {"name": "Data Discovery & Classification", "slug": "data-discovery-classification", "description": "Discover and classify sensitive data.", "display_order": 1},
                    {"name": "DSPM", "slug": "dspm", "description": "Data Security Posture Management.", "display_order": 2},
                    {"name": "Data Lineage", "slug": "data-lineage", "description": "Track data lineage across systems.", "display_order": 3},
                    {"name": "Ownership & Stewardship", "slug": "ownership-stewardship", "description": "Assign data ownership and stewardship.", "display_order": 4},
                ],
            },
            {
                "name": "Data Protection", "slug": "data-protection", "description": "Protect data at rest, in transit, and in use.", "display_order": 5,
                "sub_capabilities": [
                    {"name": "DLP", "slug": "dlp", "description": "Data Loss Prevention controls.", "display_order": 1},
                    {"name": "Encryption at Rest / In Transit", "slug": "encryption", "description": "Encrypt data at rest and in transit.", "display_order": 2},
                    {"name": "Tokenisation / Masking", "slug": "tokenisation-masking", "description": "Tokenise and mask sensitive data.", "display_order": 3},
                    {"name": "Rights Management (IRM)", "slug": "rights-management-irm", "description": "Information rights management.", "display_order": 4},
                ],
            },
            {
                "name": "AI Data Trust", "slug": "ai-data-trust", "description": "Ensure trustworthiness of AI data pipelines.", "display_order": 6,
                "sub_capabilities": [
                    {"name": "Shadow AI Discovery", "slug": "shadow-ai-discovery", "description": "Discover shadow AI usage.", "display_order": 1},
                    {"name": "Prompt / Input Security", "slug": "prompt-input-security", "description": "Secure AI prompts and inputs.", "display_order": 2},
                    {"name": "Model Security", "slug": "model-security", "description": "Secure AI models against attacks.", "display_order": 3},
                    {"name": "AI Data Governance", "slug": "ai-data-governance", "description": "Govern AI training and inference data.", "display_order": 4},
                ],
            },
            {
                "name": "Records & Data Lifecycle", "slug": "records-data-lifecycle", "description": "Manage records retention and disposition.", "display_order": 7,
                "sub_capabilities": [
                    {"name": "Retention Schedules", "slug": "retention-schedules", "description": "Define and apply retention schedules.", "display_order": 1},
                    {"name": "Legal Hold", "slug": "legal-hold", "description": "Manage legal hold on records.", "display_order": 2},
                    {"name": "Secure Disposal", "slug": "records-secure-disposal", "description": "Securely dispose of records.", "display_order": 3},
                    {"name": "Archival", "slug": "archival", "description": "Archive records for long-term retention.", "display_order": 4},
                ],
            },
            {
                "name": "Data Subject Rights", "slug": "data-subject-rights", "description": "Manage data subject rights requests.", "display_order": 8,
                "sub_capabilities": [
                    {"name": "DSAR Processing", "slug": "dsar-processing", "description": "Process Data Subject Access Requests.", "display_order": 1},
                    {"name": "Consent Management Ops", "slug": "consent-management-ops", "description": "Operationalise consent management.", "display_order": 2},
                    {"name": "Complaints Handling", "slug": "complaints-handling", "description": "Handle data subject complaints.", "display_order": 3},
                    {"name": "Regulator Liaison", "slug": "regulator-liaison", "description": "Liaise with data protection regulators.", "display_order": 4},
                ],
            },
        ],
    },
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(select(Organization))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        # Create default org
        org = Organization(
            name="Excellenta Inc.",
            slug="excellenta-inc",
        )
        db.add(org)
        await db.flush()

        # Create admin user
        admin = User(
            email="admin@excellenta.com",
            hashed_password=get_password_hash("Admin123!"),
            full_name="Admin User",
            role=UserRole.ADMIN,
            organization_id=org.id,
            email_verified=True,
        )
        db.add(admin)
        await db.flush()

        # Create assessor user
        assessor = User(
            email="assessor@excellenta.com",
            hashed_password=get_password_hash("Assess123!"),
            full_name="Assessor User",
            role=UserRole.ASSESSOR,
            organization_id=org.id,
            email_verified=True,
        )
        db.add(assessor)
        await db.flush()

        print(f"Created organization: {org.name} (ID: {org.id})")
        print(f"Created admin: {admin.email} / Admin123!")
        print(f"Created assessor: {assessor.email} / Assess123!")

        # Seed domains, capabilities, sub-capabilities, and checklist items
        for domain_data in DOMAINS:
            domain = Domain(
                name=domain_data["name"],
                slug=domain_data["slug"],
                description=domain_data["description"],
                display_order=domain_data["display_order"],
                accent_color=domain_data["accent_color"],
                icon_name=domain_data["icon_name"],
                organization_id=org.id,
            )
            db.add(domain)
            await db.flush()
            print(f"  Domain: {domain.name}")

            for cap_data in domain_data["capabilities"]:
                capability = Capability(
                    name=cap_data["name"],
                    slug=cap_data["slug"],
                    description=cap_data["description"],
                    display_order=cap_data["display_order"],
                    domain_id=domain.id,
                    organization_id=org.id,
                )
                db.add(capability)
                await db.flush()
                print(f"    L1: {capability.name}")

                for sub_data in cap_data["sub_capabilities"]:
                    sub = SubCapability(
                        name=sub_data["name"],
                        slug=sub_data["slug"],
                        description=sub_data["description"],
                        display_order=sub_data["display_order"],
                        capability_id=capability.id,
                        organization_id=org.id,
                    )
                    db.add(sub)
                    await db.flush()

                    # Create sample checklist items for each sub-capability
                    items = [
                        (f"Assess current state: {sub_data['name']}", f"Evaluate the current maturity and effectiveness of {sub_data['description'].lower()}"),
                        (f"Define target state for {sub_data['name']}", f"Define the target operating model and maturity level for {sub_data['name']}"),
                        (f"Implement controls: {sub_data['name']}", f"Implement the necessary controls and processes for {sub_data['name']}"),
                        (f"Test and validate: {sub_data['name']}", f"Test the effectiveness of implemented controls for {sub_data['name']}"),
                        (f"Document and report: {sub_data['name']}", f"Document evidence and report on {sub_data['name']} status"),
                    ]

                    for i, (title, desc) in enumerate(items):
                        item = ChecklistItem(
                            title=title,
                            description=desc,
                            status=ChecklistStatus.NOT_STARTED,
                            owner="Admin User",
                            display_order=i + 1,
                            sub_capability_id=sub.id,
                            organization_id=org.id,
                        )
                        db.add(item)

                    await db.flush()
                print(f"      L2: {cap_data['sub_capabilities'][0]['name']}... ({len(cap_data['sub_capabilities'])} sub-caps, 5 checklist items each)")

        await db.commit()
        print("\n✅ Seed completed successfully!")
        print("Login with: admin@excellenta.com / Admin123!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
