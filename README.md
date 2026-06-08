# 👁️ Fortress Observability Stack PRO v2.0

> **An enterprise-grade, HIPAA-compliant observability platform that simulates the central nervous system of a hospital. Built with zero-trust architecture, automated SSH remediation, and a 100-node Ansible deployment mesh.**

![Master Dashboard Preview](assets/dashboard_preview.png)

### 6-Pillar Infrastructure Dashboard

| Component | What It Does |
|---|---|
| 🧠 **The Brain** | Centralized Docker cluster running Prometheus, Grafana, Loki, MinIO, and Tempo. |
| 🫀 **The Organs** | 100+ bare-metal nodes monitored via Ansible-deployed Exporters & Promtail agents. |
| 🤖 **Auto-Healer** | Asynchronous Node.js agent executing SSH scripts instantly when `severity="fatal"` fires. |
| 📧 **Email Relay** | Intercepts raw JSON webhooks and translates them into styled HTML alerts via SMTP. |
| 🌐 **Synthetics** | Robotic Ping/SSL checkers ensuring 99.99% uptime of public-facing patient portals. |
| 📊 **Status Page** | Public React/Express UI showcasing SLA metrics directly fed from the Prometheus database. |

Every Fortune 500 hospital requires a **HIPAA-Compliant Command Center** to track data securely without sending PHI to the cloud. A human DevOps engineer simply cannot monitor 100 servers simultaneously. Fortress automates this entire pipeline—from log ingestion to anomaly detection to robotic self-healing.

---

## 🏗️ Architecture Blueprint — The "Brain & Organs" Loop

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'fontSize': '16px'}}}%%
graph LR
    ORG["🫀 The Organs\n(Ansible Fleet)"] -->|Streams Metrics + Logs| PROM["🧠 Prometheus & Loki\n(Central Database)"]
    PROM -->|Evaluates PromQL/LogQL| ALERT["🚨 Alertmanager\n(Routing Engine)"]
    ALERT -->|Webhooks JSON| HEALER["🤖 Auto-Healer\n(Node.js Remediation)"]
    ALERT -->|Webhooks JSON| EMAIL["📧 Email Relay\n(SMTP Notification)"]
    ALERT -.->|Optional| SMS["📱 SMS / Slack Integration"]
    HEALER -->|Executes SSH Scripts| ORG
    PROM -->|Visualizes Data| GRAF["📊 Grafana\n(Master Dashboard)"]
```

| Component | Stack | Purpose |
|---|---|---|
| **Metrics DB** | Prometheus v2.51.0 | Pulls time-series data from all endpoints; evaluates mathematical anomaly rules. |
| **Log DB** | Loki & MinIO (S3) | Aggregates application logs with a strict 90-day HIPAA retention compactor. |
| **Master UI** | Grafana v10.4.2 | Central visual command center for tracing bottlenecks. |
| **Auto-Healer** | Node.js + SSH2 | The robotic system administrator that fixes issues before humans wake up. |
| **Organs (Agents)** | Node Exporter / PM2 / Promtail | Lightweight trackers installed on all target machines via Ansible. |

**Self-Healing loop:** When `PM2` detects an application crash, `Prometheus` fires a `fatal` alert. The `Auto-Healer` receives the alert, parses the IP, SSHs into the machine, and restarts the Node.js process—recovering the hospital system in under 1.5 seconds.

---

## 🚀 Comprehensive Deployment Guide

This section outlines the exact steps required to transform the dummy configurations in this repository into a live, production-ready observability platform tailored to your specific environment.

### Phase 1: Configuring The Brain (Central Server)

The "Brain" is the central command server that runs the entire monitoring stack via Docker Compose.

**1. Clone the Repository:**
```bash
git clone https://github.com/YourRepo/Observational-Dashboard /opt/fortress
cd /opt/fortress
```

**2. Generate and Configure the `.env` File:**
The `.env` file holds all your secure passwords and configuration variables. **Never commit this file to GitHub.**
```bash
cp .env.example .env
chmod 600 .env
```
Open the `.env` file using `nano .env` and replace the following **Dummy Values** with your **Real Values**:
*   `GF_SECURITY_ADMIN_PASSWORD`: Replace `dummy-password` with a highly secure string. This is your master Grafana login.
*   `SMTP_HOST` & `SMTP_PORT`: Replace with your actual email relay (e.g., `smtp.office365.com` or your internal hospital SMTP).
*   `SMTP_USER` & `SMTP_PASS`: Replace with the actual email account credentials that will be sending the alerts.
*   `EMAIL_TO`: Replace `devops@hospital.internal` with the real email address of your IT or DevOps team.
*   `CORS_ORIGINS`: Replace with the actual domain where your Status Page will be hosted.

**3. Launch the Stack:**
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```
*Note: On first startup, the MinIO container will run a brief job to initialize the S3 buckets for Loki's 90-day retention policy.*

### Phase 2: Deploying the Organs (Ansible Fleet Setup)

You do NOT manually install tracking software on your application servers. You use Ansible to automatically deploy the agents (Node Exporter, PM2 Exporter, Promtail) to hundreds of servers simultaneously.

**1. Replace Dummy IPs with Real Target IPs:**
Open the Ansible inventory file:
```bash
nano fortress-ansible/inventory/hosts.ini
```
Under the `[appservers]` block, you will see dummy lines like `app-001 ansible_host=10.0.1.1`. **Delete these dummy lines** and replace them with the actual IP addresses of your real production servers:
```ini
[appservers]
database-server ansible_host=192.168.10.50
web-portal ansible_host=192.168.10.51
```

**2. Configure Passwordless SSH:**
Ansible does not use passwords. You must generate an SSH key on your Brain server and distribute it to your target nodes.
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/fortress_deploy
ssh-copy-id -i ~/.ssh/fortress_deploy deploy@192.168.10.50
```

**3. Execute the Playbook:**
```bash
cd fortress-ansible
ansible-playbook -i inventory/hosts.ini site.yml
```

### Phase 3: Activating the Auto-Healer

The Auto-Healer relies on SSH keys to access your target servers and execute recovery commands. 

1. Ensure the Brain Server has a valid private SSH key that can access the target servers.
2. Open your `.env` file and verify the `SSH_KEY_PATH` points to the exact absolute path of your private key (e.g., `/etc/ssh_keys/id_rsa`).
3. You must bind-mount this key into the `auto-healer` container within your `docker-compose.yml` so the Node.js script has access to it.

---

## 📡 Adding Custom Alert Channels (SMS, Slack, PagerDuty)

By default, Fortress routes all critical alerts to the **Email Relay**. However, Alertmanager is highly extensible and can route alerts to SMS providers, Slack, Microsoft Teams, or PagerDuty.

To add a new alerting channel, you need to modify the `alertmanager/alertmanager.yml` file.

### 1. Adding SMS Alerts (via Webhook / Twilio / MSG91)
If your hospital requires text messages for `fatal` alerts, you can point Alertmanager to an SMS API webhook.
Open `alertmanager/alertmanager.yml` and add a new receiver:

```yaml
receivers:
  - name: 'sms-api'
    webhook_configs:
      - url: 'https://api.your-sms-provider.com/send?token=YOUR_API_TOKEN'
        send_resolved: true
```

Then, update the `route` block at the top of the file to send alerts to the SMS receiver:
```yaml
route:
  receiver: 'sms-api'
  routes:
    - matchers:
        - severity="fatal"
      receiver: 'sms-api'
```

### 2. Adding Slack / Microsoft Teams Integration
To send alerts directly to a DevOps Slack channel:

```yaml
receivers:
  - name: 'slack-devops'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
        channel: '#server-alerts'
        title: '{{ template "slack.default.title" . }}'
        text: '{{ template "slack.default.text" . }}'
```

### Applying Alertmanager Changes
Whenever you modify `alertmanager/alertmanager.yml`, you must reload Alertmanager for the changes to take effect:
```bash
curl -X POST http://localhost:9093/-/reload
```

---

## 🌐 Tracking External Services (Synthetics & SSL)

Fortress includes a Blackbox Exporter that acts as a robotic user to verify that your public-facing websites are online and that their SSL certificates haven't expired.

**Replacing Dummy URLs:**
1. Open the file `prometheus/prometheus.local.yml`.
2. Scroll down to the `blackbox_ping` and `blackbox_ssl` jobs.
3. You will see dummy URLs like `https://www.example.com`. Delete these and replace them with the real, public URLs of your hospital patient portals or APIs.
   ```yaml
   - targets:
     - https://patient-portal.yourhospital.com
     - https://api.yourhospital.com/v1/health
   ```
4. Reload Prometheus to instantly begin tracking the new URLs:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

The public **Status Page** will instantly read these new targets from Prometheus and display their live SLA metrics to your users.
