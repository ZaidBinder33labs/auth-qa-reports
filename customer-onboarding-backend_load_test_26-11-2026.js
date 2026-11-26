import http from "k6/http";
import { Counter, Trend } from "k6/metrics";
import { check, sleep } from "k6";

const REPO_NAME = __ENV.REPO_NAME || "customer-onboarding-backend";
const TEST_DATE = __ENV.TEST_DATE || "26-11-2026";
const REPORT_LABEL = __ENV.REPORT_LABEL || `${REPO_NAME} load test ${TEST_DATE}`;
const BASE_URL = (
  __ENV.BASE_URL ||
  "https://customer-onboarding-backend-dnazd3e3h0dfbpfe.centralindia-01.azurewebsites.net"
).replace(/\/+$/, "");

const GROUP = (__ENV.GROUP || "clean_reads").toLowerCase();
const PROFILE = (__ENV.PROFILE || "baseline").toLowerCase();
const RUN_ALL_TYPES =
  String(__ENV.RUN_ALL_TYPES || __ENV.RUN_ALL || "false").toLowerCase() === "true" ||
  PROFILE === "all" ||
  PROFILE === "all_types";

const TENANT_TOKEN = __ENV.TENANT_TOKEN || "";
const PLATFORM_TOKEN = __ENV.PLATFORM_TOKEN || "";

const overall2xx = new Counter("http_status_2xx");
const overall4xx = new Counter("http_status_4xx");
const overall5xx = new Counter("http_status_5xx");

const IDS = {
  tenantId: __ENV.TENANT_ID || "1",
  userId: __ENV.USER_ID || "1",
  screenCode: __ENV.SCREEN_CODE || "SCR_01",
  requestId: __ENV.REQUEST_ID || "1",
  notificationId: __ENV.NOTIFICATION_ID || "1",
  sessionId: __ENV.SESSION_ID || "1",
  paymentId: __ENV.PAYMENT_ID || "1",
  referenceId: __ENV.REFERENCE_ID || "REF_01",
  onboardingId: __ENV.ONBOARDING_ID || "ONB_01",
  domain: __ENV.DOMAIN || "example.com",
  exceptionId: __ENV.EXCEPTION_ID || "1",
  roleId: __ENV.ROLE_ID || "1",
  logoName: __ENV.LOGO_NAME || "logo.png",
  avatarScope: __ENV.AVATAR_SCOPE || "user",
  avatarName: __ENV.AVATAR_NAME || "avatar.png",
};

// All Test Types (Smoke, Baseline, Concurrency, Load, Spike, Stress, Breakpoint, Volume, Soak, Endurance, Scalability, Capacity)
const PROFILES = {
  smoke: [
    { duration: "15s", target: 1 },
    { duration: "15s", target: 1 },
    { duration: "10s", target: 0 },
  ],
  baseline: [
    { duration: "30s", target: 3 },
    { duration: "1m", target: 3 },
    { duration: "15s", target: 0 },
  ],
  concurrency: [
    { duration: "10s", target: 50 },
    { duration: "45s", target: 50 },
    { duration: "10s", target: 0 },
  ],
  load: [
    { duration: "30s", target: 30 },
    { duration: "1m", target: 30 },
    { duration: "15s", target: 0 },
  ],
  spike: [
    { duration: "10s", target: 5 },
    { duration: "10s", target: 120 },
    { duration: "30s", target: 120 },
    { duration: "10s", target: 5 },
    { duration: "15s", target: 0 },
  ],
  stress: [
    { duration: "20s", target: 40 },
    { duration: "20s", target: 80 },
    { duration: "20s", target: 120 },
    { duration: "15s", target: 0 },
  ],
  breakpoint: [
    { duration: "15s", target: 30 },
    { duration: "15s", target: 60 },
    { duration: "15s", target: 100 },
    { duration: "15s", target: 150 },
    { duration: "15s", target: 0 },
  ],
  volume: [
    { duration: "20s", target: 15 },
    { duration: "45s", target: 15 },
    { duration: "15s", target: 0 },
  ],
  soak: [
    { duration: "20s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "15s", target: 0 },
  ],
  endurance: [
    { duration: "20s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "15s", target: 0 },
  ],
  scalability: [
    { duration: "20s", target: 25 },
    { duration: "45s", target: 50 },
    { duration: "15s", target: 0 },
  ],
  capacity: [
    { duration: "20s", target: 25 },
    { duration: "20s", target: 50 },
    { duration: "20s", target: 75 },
    { duration: "15s", target: 0 },
  ],
};

const ALL_RUN_ORDER = [
  "smoke",
  "baseline",
  "concurrency",
  "load",
  "spike",
  "stress",
  "breakpoint",
  "volume",
  "soak",
  "endurance",
  "scalability",
  "capacity",
];

const GROUPS = {
  clean_reads: [
    { name: "health", method: "GET", path: "/health", auth: "none" },
    { name: "health_ready", method: "GET", path: "/health/ready", auth: "none" },
    { name: "ping", method: "GET", path: "/api/v1/ping", auth: "none" },
  ],
  health_reads: [
    { name: "health", method: "GET", path: "/health", auth: "none" },
    { name: "health_ready", method: "GET", path: "/health/ready", auth: "none" },
    { name: "ping", method: "GET", path: "/api/v1/ping", auth: "none" },
    { name: "public_plans", method: "GET", path: "/api/v1/public/plans", auth: "none" },
    { name: "scheduled_call", method: "GET", path: `/api/v1/public/scheduled-call/${IDS.referenceId}`, auth: "none" },
    { name: "public_logo", method: "GET", path: `/api/v1/public/logos/${IDS.tenantId}/${IDS.logoName}`, auth: "none" },
    { name: "public_avatar", method: "GET", path: `/api/v1/public/avatars/${IDS.avatarScope}/${IDS.userId}/${IDS.avatarName}`, auth: "none" },
    { name: "public_signup_status", method: "GET", path: `/api/v1/public/signup/${IDS.onboardingId}`, auth: "none" },
  ],
  public_flows: [
    { name: "public_contact", method: "POST", path: "/api/v1/public/contact", auth: "none", body: { name: "loadtest_user", email: "lt@example.com", message: "test" } },
    { name: "public_demo_request", method: "POST", path: "/api/v1/public/demo-request", auth: "none", body: { name: "loadtest_user", email: "lt@example.com", company: "LT Corp" } },
    { name: "public_callback", method: "POST", path: "/api/v1/public/callback-request", auth: "none", body: { name: "loadtest_user", phone: "9999999999" } },
    { name: "public_invite_check", method: "POST", path: "/api/v1/public/invite/check", auth: "none", body: { token: "sample_invite_token" } },
  ],
  auth_account: [
    { name: "auth_me", method: "GET", path: "/api/v1/auth/me", auth: "tenant" },
    { name: "auth_me_access", method: "GET", path: "/api/v1/auth/me/access", auth: "tenant" },
    { name: "auth_me_catalogue", method: "GET", path: "/api/v1/auth/me/catalogue", auth: "tenant" },
    { name: "notifications", method: "GET", path: "/api/v1/auth/me/notifications", auth: "tenant" },
    { name: "notifications_count", method: "GET", path: "/api/v1/auth/me/notifications/count", auth: "tenant" },
    { name: "access_requests", method: "GET", path: "/api/v1/auth/me/access-requests", auth: "tenant" },
  ],
  tenant_ops: [
    { name: "tenant_users", method: "GET", path: "/api/v1/tenant/users", auth: "tenant" },
    { name: "tenant_seats", method: "GET", path: "/api/v1/tenant/seats", auth: "tenant" },
    { name: "tenant_members", method: "GET", path: "/api/v1/tenant/members", auth: "tenant" },
    { name: "tenant_company", method: "GET", path: "/api/v1/tenant/company", auth: "tenant" },
    { name: "tenant_units", method: "GET", path: "/api/v1/tenant/units", auth: "tenant" },
    { name: "tenant_billing", method: "GET", path: "/api/v1/tenant/billing", auth: "tenant" },
    { name: "tenant_payments", method: "GET", path: "/api/v1/tenant/payments", auth: "tenant" },
    { name: "tenant_access_requests", method: "GET", path: "/api/v1/tenant/access-requests", auth: "tenant" },
    { name: "tenant_approvers", method: "GET", path: `/api/v1/tenant/screens/${IDS.screenCode}/approvers`, auth: "tenant" },
  ],
  platform_ops: [
    { name: "platform_summary", method: "GET", path: "/api/v1/platform/summary", auth: "platform" },
    { name: "platform_status", method: "GET", path: "/api/v1/platform/status", auth: "platform" },
    { name: "platform_tenants", method: "GET", path: "/api/v1/platform/tenants", auth: "platform" },
    { name: "platform_modules", method: "GET", path: "/api/v1/platform/modules", auth: "platform" },
    { name: "platform_roles", method: "GET", path: "/api/v1/platform/roles", auth: "platform" },
    { name: "platform_team", method: "GET", path: "/api/v1/platform/team", auth: "platform" },
    { name: "platform_audit", method: "GET", path: "/api/v1/platform/audit", auth: "platform" },
    { name: "platform_payments", method: "GET", path: "/api/v1/platform/payments", auth: "platform" },
  ],
  webhooks: [
    {
      name: "razorpay_webhook",
      method: "POST",
      path: "/api/v1/webhooks/razorpay",
      auth: "none",
      body: {
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_loadtest_001", amount: 10000 } } },
      },
    },
  ],
};

function resolveEndpoints() {
  if (__ENV.ENDPOINTS_JSON) {
    return JSON.parse(__ENV.ENDPOINTS_JSON);
  }
  return GROUPS[GROUP] || GROUPS.clean_reads;
}

const activeEndpoints = resolveEndpoints();

const epTrends = {};
const ep2xx = {};
const ep4xx = {};
const ep5xx = {};
const modeDurTrends = {};
const modeFailCounters = {};
const modeReqCounters = {};

for (const ep of activeEndpoints) {
  epTrends[ep.name] = new Trend(`ep_dur_${ep.name}`, true);
  ep2xx[ep.name] = new Counter(`ep_2xx_${ep.name}`);
  ep4xx[ep.name] = new Counter(`ep_4xx_${ep.name}`);
  ep5xx[ep.name] = new Counter(`ep_5xx_${ep.name}`);
}

for (const m of ALL_RUN_ORDER) {
  modeDurTrends[m] = new Trend(`mode_dur_${m}`, true);
  modeFailCounters[m] = new Counter(`mode_fail_${m}`);
  modeReqCounters[m] = new Counter(`mode_req_${m}`);
}

function stageSeconds(stages) {
  let sec = 0;
  for (const s of stages) {
    const val = parseFloat(s.duration);
    if (s.duration.endsWith("m")) sec += val * 60;
    else if (s.duration.endsWith("s")) sec += val;
  }
  return Math.ceil(sec);
}

function buildOptions() {
  if (RUN_ALL_TYPES) {
    const scenarios = {};
    let cursorSec = 0;
    for (const modeName of ALL_RUN_ORDER) {
      const stages = PROFILES[modeName] || PROFILES.baseline;
      scenarios[`sc_${modeName}`] = {
        executor: "ramping-vus",
        startTime: `${cursorSec}s`,
        stages,
        exec: `exec_${modeName}`,
      };
      cursorSec += stageSeconds(stages) + 5;
    }
    return {
      scenarios,
      summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
      thresholds: {
        http_req_failed: ["rate<0.02"],
        http_req_duration: ["p(95)<1000"],
      },
    };
  }

  return {
    stages: PROFILES[PROFILE] || PROFILES.baseline,
    summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
    thresholds: {
      http_req_failed: ["rate<0.02"],
      http_req_duration: ["p(95)<1000"],
    },
  };
}

export const options = buildOptions();

function buildHeaders(authType) {
  const headers = { "Content-Type": "application/json" };
  if (authType === "tenant" && TENANT_TOKEN) {
    headers.Authorization = `Bearer ${TENANT_TOKEN}`;
  } else if (authType === "platform" && PLATFORM_TOKEN) {
    headers.Authorization = `Bearer ${PLATFORM_TOKEN}`;
  }
  return headers;
}

function runForMode(modeName) {
  for (const ep of activeEndpoints) {
    const url = `${BASE_URL}${ep.path}`;
    const params = {
      headers: buildHeaders(ep.auth),
      tags: {
        repo: REPO_NAME,
        test_date: TEST_DATE,
        group: GROUP,
        profile: modeName,
        endpoint: ep.name,
        method: ep.method,
      },
    };

    const payload = ep.body ? JSON.stringify(ep.body) : null;
    const res =
      ep.method === "GET"
        ? http.get(url, params)
        : http.request(ep.method, url, payload, params);

    const dur = res.timings.duration || 0;
    epTrends[ep.name].add(dur);
    modeDurTrends[modeName].add(dur);
    modeReqCounters[modeName].add(1);

    if (res.status >= 200 && res.status < 300) {
      overall2xx.add(1);
      ep2xx[ep.name].add(1);
    } else if (res.status >= 400 && res.status < 500) {
      overall4xx.add(1);
      ep4xx[ep.name].add(1);
      modeFailCounters[modeName].add(1);
    } else if (res.status >= 500 || res.status === 0) {
      overall5xx.add(1);
      ep5xx[ep.name].add(1);
      modeFailCounters[modeName].add(1);
    }

    check(res, {
      "status < 500": (r) => r.status > 0 && r.status < 500,
    });
  }

  if (modeName !== "concurrency") {
    sleep(0.5);
  }
}

export default function () {
  runForMode(PROFILES[PROFILE] ? PROFILE : "baseline");
}

export function exec_smoke() { runForMode("smoke"); }
export function exec_baseline() { runForMode("baseline"); }
export function exec_concurrency() { runForMode("concurrency"); }
export function exec_load() { runForMode("load"); }
export function exec_spike() { runForMode("spike"); }
export function exec_stress() { runForMode("stress"); }
export function exec_breakpoint() { runForMode("breakpoint"); }
export function exec_volume() { runForMode("volume"); }
export function exec_soak() { runForMode("soak"); }
export function exec_endurance() { runForMode("endurance"); }
export function exec_scalability() { runForMode("scalability"); }
export function exec_capacity() { runForMode("capacity"); }

function fmt(val, digits = 2) {
  return typeof val === "number" && !Number.isNaN(val) ? val.toFixed(digits) : "-";
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function evaluateMode(modeName, failPct, p95Ms) {
  const limits = {
    smoke: { maxErr: 0.0, maxP95: 500 },
    baseline: { maxErr: 0.5, maxP95: 400 },
    concurrency: { maxErr: 1.0, maxP95: 800 },
    load: { maxErr: 1.0, maxP95: 600 },
    spike: { maxErr: 3.0, maxP95: 1200 },
    stress: { maxErr: 5.0, maxP95: 1500 },
    breakpoint: { maxErr: 5.0, maxP95: 1500 },
    volume: { maxErr: 1.0, maxP95: 1500 },
    soak: { maxErr: 1.0, maxP95: 800 },
    endurance: { maxErr: 1.0, maxP95: 800 },
    scalability: { maxErr: 1.0, maxP95: 800 },
    capacity: { maxErr: 1.0, maxP95: 800 },
  };
  const rule = limits[modeName] || { maxErr: 2.0, maxP95: 1000 };
  const passed = failPct <= rule.maxErr && p95Ms <= rule.maxP95;
  return {
    passed,
    ruleText: `err <= ${rule.maxErr}%, p95 < ${rule.maxP95} ms`,
  };
}

function buildLatencySvg(epDetails) {
  if (!epDetails.length) return "<p>No endpoint data for chart.</p>";
  const barHeight = 28;
  const gap = 12;
  const labelWidth = 180;
  const chartWidth = 480;
  const svgWidth = labelWidth + chartWidth + 160;
  const svgHeight = epDetails.length * (barHeight + gap) + 45;
  const maxVal = Math.max(100, ...epDetails.map((d) => Math.max(d.p95Num, d.maxNum)));

  const bars = epDetails
    .map((d, idx) => {
      const y = 30 + idx * (barHeight + gap);
      const p95W = Math.max(2, (d.p95Num / maxVal) * chartWidth);
      const maxW = Math.max(2, (d.maxNum / maxVal) * chartWidth);
      return `
        <text x="0" y="${y + 18}" font-size="12" fill="#0f172a" font-family="monospace">${esc(d.name)}</text>
        <rect x="${labelWidth}" y="${y}" width="${maxW.toFixed(1)}" height="${barHeight}" rx="4" fill="#fde68a" />
        <rect x="${labelWidth}" y="${y + 5}" width="${p95W.toFixed(1)}" height="${barHeight - 10}" rx="3" fill="#2563eb" />
        <text x="${labelWidth + maxW + 8}" y="${y + 18}" font-size="11" fill="#334155">p95: ${fmt(d.p95Num, 0)}ms | max: ${fmt(d.maxNum, 0)}ms</text>
      `;
    })
    .join("");

  return `
    <div style="margin-bottom:8px;font-size:12px;color:#475569;">
      <span style="display:inline-block;width:12px;height:12px;background:#2563eb;border-radius:2px;margin-right:4px;"></span>p95 Latency
      <span style="display:inline-block;width:12px;height:12px;background:#fde68a;border:1px solid #f59e0b;border-radius:2px;margin-left:14px;margin-right:4px;"></span>Max Spike Latency
    </div>
    <svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" style="max-width:${svgWidth}px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;">
      ${bars}
    </svg>
  `;
}

function buildStatusSvg(c2xx, c4xx, c5xx) {
  const total = Math.max(1, c2xx + c4xx + c5xx);
  const w2 = (c2xx / total) * 500;
  const w4 = (c4xx / total) * 500;
  const w5 = (c5xx / total) * 500;

  return `
    <svg width="100%" viewBox="0 0 680 95" style="max-width:680px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;">
      <rect x="10" y="14" width="500" height="24" rx="4" fill="#e2e8f0" />
      <rect x="10" y="14" width="${w2.toFixed(1)}" height="24" rx="4" fill="#16a34a" />
      <rect x="${(10 + w2).toFixed(1)}" y="14" width="${w4.toFixed(1)}" height="24" fill="#f59e0b" />
      <rect x="${(10 + w2 + w4).toFixed(1)}" y="14" width="${w5.toFixed(1)}" height="24" fill="#dc2626" />
      <text x="10" y="62" font-size="12" fill="#166534">2xx Success: ${c2xx} (${((c2xx / total) * 100).toFixed(1)}%)</text>
      <text x="210" y="62" font-size="12" fill="#92400e">4xx Client: ${c4xx} (${((c4xx / total) * 100).toFixed(1)}%)</text>
      <text x="410" y="62" font-size="12" fill="#991b1b">5xx/Err: ${c5xx} (${((c5xx / total) * 100).toFixed(1)}%)</text>
    </svg>
  `;
}

export function handleSummary(data) {
  const scriptFile = "customer-onboarding-backend_load_test_26-11-2026.js";
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const rps = data.metrics.http_reqs?.values?.rate || 0;
  const failRate = (data.metrics.http_req_failed?.values?.rate || 0) * 100;
  const dur = data.metrics.http_req_duration?.values || {};
  const p95Val = typeof dur["p(95)"] === "number" ? dur["p(95)"] : 0;
  const maxVal = typeof dur.max === "number" ? dur.max : 0;

  const c2xx = data.metrics.http_status_2xx?.values?.count || 0;
  const c4xx = data.metrics.http_status_4xx?.values?.count || 0;
  const c5xx = data.metrics.http_status_5xx?.values?.count || 0;

  const modesToShow = RUN_ALL_TYPES ? ALL_RUN_ORDER : [PROFILE];
  let passedCount = 0;
  let failedCount = 0;

  const modeRowsHtml = modesToShow
    .map((mKey, idx) => {
      const mReq = data.metrics[`mode_req_${mKey}`]?.values?.count || 0;
      const mFail = data.metrics[`mode_fail_${mKey}`]?.values?.count || 0;
      const mDur = data.metrics[`mode_dur_${mKey}`]?.values || {};
      const mFailPct = mReq > 0 ? (mFail / mReq) * 100 : failRate;
      const mP95 = typeof mDur["p(95)"] === "number" ? mDur["p(95)"] : p95Val;
      const mMax = typeof mDur.max === "number" ? mDur.max : maxVal;

      const ev = evaluateMode(mKey, mFailPct, mP95);
      if (ev.passed) passedCount++;
      else failedCount++;

      const badge = ev.passed
        ? `<span class="pass">PASS</span>`
        : `<span class="fail">FAIL</span>`;
      const runCmd = `k6 run -e REPO_NAME=${REPO_NAME} -e TEST_DATE=${TEST_DATE} -e GROUP=${GROUP} -e PROFILE=${mKey} ${scriptFile}`;

      return `
        <tr>
          <td><strong>${esc(mKey.toUpperCase())}</strong></td>
          <td>${esc(ev.ruleText)}</td>
          <td>${badge}</td>
          <td>${mReq}</td>
          <td>${fmt(mFailPct, 1)}%</td>
          <td>${fmt(mP95)} ms</td>
          <td>${fmt(mMax)} ms</td>
          <td><code id="m_cmd_${idx}">${esc(runCmd)}</code> <button class="btn-sm" onclick="copyText('m_cmd_${idx}', this)">Copy</button></td>
        </tr>`;
    })
    .join("");

  const epDetails = activeEndpoints
    .map((ep) => {
      const v = data.metrics[`ep_dur_${ep.name}`]?.values || {};
      const s2 = data.metrics[`ep_2xx_${ep.name}`]?.values?.count || 0;
      const s4 = data.metrics[`ep_4xx_${ep.name}`]?.values?.count || 0;
      const s5 = data.metrics[`ep_5xx_${ep.name}`]?.values?.count || 0;
      const epReqs = s2 + s4 + s5;
      const epErrPct = epReqs > 0 ? ((s4 + s5) / epReqs) * 100 : 0;
      const avgNum = typeof v.avg === "number" ? v.avg : 0;
      const p90Num = typeof v["p(90)"] === "number" ? v["p(90)"] : 0;
      const p95Num = typeof v["p(95)"] === "number" ? v["p(95)"] : 0;
      const p99Num = typeof v["p(99)"] === "number" ? v["p(99)"] : 0;
      const maxNum = typeof v.max === "number" ? v.max : 0;

      let verdict = `<span class="pass">PASS</span>`;
      let problem = "No issue detected";
      let ctaCmd = `k6 run -e REPO_NAME=${REPO_NAME} -e TEST_DATE=${TEST_DATE} -e GROUP=${GROUP} -e PROFILE=load ${scriptFile}`;

      if (s5 > 0) {
        verdict = `<span class="fail">FAIL (5xx/ERR)</span>`;
        problem = `${s5} server/network failures — check Azure logs, DB pool, or connection limits`;
        ctaCmd = `curl -i "${BASE_URL}${ep.path}"`;
      } else if (epErrPct > 2) {
        verdict = `<span class="fail">FAIL (4xx)</span>`;
        problem = `${fmt(epErrPct, 1)}% 4xx responses (${s4}) — check token, path IDs, or request body`;
        ctaCmd = `set DEV_TOKEN=paste_fresh_token_without_Bearer`;
      } else if (p95Num > 1000) {
        verdict = `<span class="fail">SLOW p95</span>`;
        problem = `p95 (${fmt(p95Num)} ms) > 1000 ms — inspect slow query / downstream service`;
        ctaCmd = `k6 run -e REPO_NAME=${REPO_NAME} -e TEST_DATE=${TEST_DATE} -e GROUP=${GROUP} -e PROFILE=baseline ${scriptFile}`;
      } else if (maxNum > 3000) {
        verdict = `<span class="warn">SPIKE MAX</span>`;
        problem = `Max spike ${fmt(maxNum)} ms — possible cold start or lock wait`;
        ctaCmd = `k6 run -e REPO_NAME=${REPO_NAME} -e TEST_DATE=${TEST_DATE} -e GROUP=${GROUP} -e PROFILE=spike ${scriptFile}`;
      }

      return {
        name: ep.name,
        method: ep.method,
        path: ep.path,
        auth: ep.auth,
        epReqs,
        s2,
        s4,
        s5,
        epErrPct,
        avgNum,
        p90Num,
        p95Num,
        p99Num,
        maxNum,
        verdict,
        problem,
        ctaCmd,
      };
    });

  const ctas = [];
  if (c5xx > 0) {
    ctas.push({
      title: `Fix ${c5xx} Server / Connection Errors`,
      desc: "Server 5xx or connection timeouts occurred under load. Check Azure App Service metrics, DB connection pool, and retry logic.",
      cmd: `curl -i "${BASE_URL}/health/ready"`,
    });
  }
  if (c4xx > 0) {
    ctas.push({
      title: `Fix ${c4xx} Client 4xx Errors`,
      desc: "4xx responses indicate missing/expired token, invalid path IDs, or bad payload.",
      cmd: `set DEV_TOKEN=paste_fresh_token_without_Bearer`,
    });
  }
  if (p95Val > 1000 || maxVal > 3000) {
    ctas.push({
      title: `Address High Latency (p95: ${fmt(p95Val)} ms, max: ${fmt(maxVal)} ms)`,
      desc: "Latency exceeded target under higher load profiles.",
      cmd: `k6 run -e REPO_NAME=${REPO_NAME} -e TEST_DATE=${TEST_DATE} -e GROUP=clean_reads -e PROFILE=baseline ${scriptFile}`,
    });
  }
  if (!ctas.length) {
    ctas.push({
      title: "All Checked Profiles Healthy",
      desc: "No critical 4xx/5xx or latency failures found in this execution.",
      cmd: `k6 run -e REPO_NAME=${REPO_NAME} -e TEST_DATE=${TEST_DATE} -e GROUP=clean_reads -e PROFILE=load ${scriptFile}`,
    });
  }

  const ctaCardsHtml = ctas
    .map(
      (c, i) => `
      <div class="cta-box">
        <div class="cta-title">CTA ${i + 1}: ${esc(c.title)}</div>
        <div class="cta-desc">${esc(c.desc)}</div>
        <div class="cta-row">
          <code id="cta_top_${i}">${esc(c.cmd)}</code>
          <button class="btn" onclick="copyText('cta_top_${i}', this)">Copy CTA</button>
        </div>
      </div>`
    )
    .join("");

  const endpointRowsHtml = epDetails
    .map(
      (d, idx) => `
      <tr>
        <td><strong>${esc(d.method)}</strong></td>
        <td><code>${esc(d.name)}</code></td>
        <td><code>${esc(d.path)}</code></td>
        <td><code>${esc(d.auth)}</code></td>
        <td>${d.epReqs}</td>
        <td>${d.s2} / ${d.s4} / ${d.s5}</td>
        <td>${fmt(d.epErrPct, 1)}%</td>
        <td>${fmt(d.avgNum)} ms</td>
        <td>${fmt(d.p90Num)} ms</td>
        <td>${fmt(d.p95Num)} ms</td>
        <td>${fmt(d.p99Num)} ms</td>
        <td>${fmt(d.maxNum)} ms</td>
        <td>${d.verdict}</td>
        <td>${esc(d.problem)}<br/><code id="ep_row_${idx}">${esc(d.ctaCmd)}</code> <button class="btn-sm" onclick="copyText('ep_row_${idx}', this)">CTA</button></td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(REPORT_LABEL)} — All Test Types</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f8fafc; color: #0f172a; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi { background: #f1f5f9; padding: 12px; border-radius: 6px; }
    .kpi .label { font-size: 12px; color: #475569; }
    .kpi .val { font-size: 20px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; font-size: 12px; vertical-align: top; }
    th { background: #f1f5f9; }
    code { background: #e2e8f0; padding: 2px 5px; border-radius: 4px; font-size: 11px; word-break: break-all; }
    .pass { background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 4px; font-weight: bold; }
    .fail { background: #fee2e2; color: #991b1b; padding: 2px 7px; border-radius: 4px; font-weight: bold; }
    .warn { background: #fef9c3; color: #854d0e; padding: 2px 7px; border-radius: 4px; font-weight: bold; }
    .cta-box { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
    .cta-title { font-weight: bold; font-size: 13px; color: #0f172a; }
    .cta-desc { font-size: 12px; color: #475569; margin: 4px 0 8px 0; }
    .cta-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .btn { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap; }
    .btn:hover { background: #1d4ed8; }
    .btn-sm { background: #334155; color: #fff; border: none; padding: 2px 7px; border-radius: 4px; cursor: pointer; font-size: 11px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${esc(REPORT_LABEL)} — Single Combined Report</h2>
    <p><strong>Repo:</strong> <code>${esc(REPO_NAME)}</code> | <strong>Date:</strong> <code>${esc(TEST_DATE)}</code> | <strong>Target:</strong> ${esc(BASE_URL)}</p>
    <p><strong>Group:</strong> <code>${esc(GROUP)}</code> | <strong>Modes Passed:</strong> <span class="pass">${passedCount}</span> | <strong>Modes Failed:</strong> <span class="fail">${failedCount}</span></p>
    <div class="grid">
      <div class="kpi"><div class="label">Total Requests</div><div class="val">${totalReqs}</div></div>
      <div class="kpi"><div class="label">Throughput (RPS)</div><div class="val">${fmt(rps)}</div></div>
      <div class="kpi"><div class="label">Error Rate</div><div class="val">${fmt(failRate)}%</div></div>
      <div class="kpi"><div class="label">Overall p95 Latency</div><div class="val">${fmt(p95Val)} ms</div></div>
    </div>
  </div>

  <div class="card">
    <h3>All Test Types Results (Smoke, Baseline, Concurrency, Load, Spike, Stress, Breakpoint, Volume, Soak, Endurance, Scalability, Capacity)</h3>
    <table>
      <thead>
        <tr><th>Test Type</th><th>Rule</th><th>Verdict</th><th>Reqs</th><th>Err %</th><th>p95</th><th>Max</th><th>Run Command</th></tr>
      </thead>
      <tbody>${modeRowsHtml}</tbody>
    </table>
  </div>

  <div class="card">
    <h3>Actionable CTAs &amp; Bottlenecks</h3>
    ${ctaCardsHtml}
  </div>

  <div class="card">
    <h3>Status Distribution Graph (2xx / 4xx / 5xx)</h3>
    ${buildStatusSvg(c2xx, c4xx, c5xx)}
  </div>

  <div class="card">
    <h3>Endpoint Latency Graph (p95 vs Max Spike)</h3>
    ${buildLatencySvg(epDetails)}
  </div>

  <div class="card">
    <h3>Each Endpoint Detailed Report &amp; CTAs</h3>
    <table>
      <thead>
        <tr>
          <th>Method</th><th>Endpoint</th><th>Path</th><th>Auth</th><th>Reqs</th>
          <th>2xx/4xx/5xx</th><th>Err %</th><th>Avg</th><th>p90</th><th>p95</th><th>p99</th><th>Max</th><th>Verdict</th><th>Problem &amp; CTA</th>
        </tr>
      </thead>
      <tbody>${endpointRowsHtml}</tbody>
    </table>
  </div>

  <script>
    function copyText(elId, btn) {
      const el = document.getElementById(elId);
      if (!el) return;
      navigator.clipboard.writeText(el.innerText).then(() => {
        const old = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => { btn.innerText = old; }, 1200);
      });
    }
  </script>
</body>
</html>`;

  const baseFileName = `${REPO_NAME}_load_test_${TEST_DATE}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const suffix = RUN_ALL_TYPES
    ? "_all_11_types"
    : __ENV.REPORT_SUFFIX
      ? `_${__ENV.REPORT_SUFFIX}`
      : `_${GROUP}_${PROFILE}`;
  const fileName = `${baseFileName}${suffix}.html`;

  return {
    stdout: JSON.stringify(data, null, 2),
    [fileName]: html,
  };
}