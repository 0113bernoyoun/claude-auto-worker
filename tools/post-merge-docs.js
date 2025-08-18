#!/usr/bin/env node
/*
  Post-merge documentation updater
  - Creates dev-notes/[작업ID]-완료-문서.md
  - Updates status.md with current state
  - Updates README.md progress section
  - Updates tasks.md marking the task as completed
*/

const fs = require('fs');
const path = require('path');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return '';
  }
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function appendFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, content, 'utf8');
}

function replaceSection(content, headerRegex, newSection) {
  const match = content.match(headerRegex);
  if (!match) return content + '\n\n' + newSection + '\n';
  const start = match.index;
  // find next same-level header (## or higher)
  const tail = content.slice(start);
  const nextHeaderIdx = tail.slice(match[0].length).search(/\n#{1,6} \S/);
  if (nextHeaderIdx === -1) {
    return content.slice(0, start) + newSection + '\n';
  }
  const end = start + match[0].length + nextHeaderIdx + 1; // include leading newline
  return content.slice(0, start) + newSection + '\n' + content.slice(end);
}

function extractTaskId(...texts) {
  for (const t of texts) {
    if (!t) continue;
    const rxList = [
      /(TASK[-_ ]?\d{2,4})/i,
      /(TASK\d{2,4})/i,
      /(작업ID[:\-\s]*([A-Za-z0-9_-]+))/i,
    ];
    for (const rx of rxList) {
      const m = t.match(rx);
      if (m) return (m[1] || m[2]).toUpperCase();
    }
  }
  return 'TASK-UNKNOWN';
}

function nowISOString() {
  return new Date().toISOString();
}

function main() {
  const prNumber = process.env.PR_NUMBER || '';
  const prTitle = process.env.PR_TITLE || '';
  const prBody = process.env.PR_BODY || '';
  const mergedAt = process.env.PR_MERGED_AT || nowISOString();
  const mergedBy = process.env.PR_MERGED_BY || 'unknown';

  const taskId = extractTaskId(prTitle, prBody);
  const safeTaskId = taskId.replace(/[^A-Za-z0-9_-]/g, '-');

  // 1) dev-notes/[작업ID]-완료-문서.md
  const devNotesDir = path.join(process.cwd(), 'dev-notes');
  const devNotePath = path.join(devNotesDir, `${safeTaskId}-완료-문서.md`);
  if (!fs.existsSync(devNotePath)) {
    const content = `# ${taskId} 완료 문서\n\n- 병합 PR: #${prNumber}\n- 제목: ${prTitle}\n- 병합 시각: ${mergedAt}\n- 병합자: ${mergedBy}\n\n## 개요\n${prBody || 'PR 본문 없음'}\n\n## 변경 사항\n- 코드 및 문서 업데이트 자동 생성\n\n## 검증\n- CI 통과 및 머지 완료\n`;
    writeFileEnsured(devNotePath, content);
  } else {
    appendFileEnsured(
      devNotePath,
      `\n\n---\n추가 병합 기록 (${nowISOString()}): PR #${prNumber} - ${prTitle}\n`
    );
  }

  // 2) status.md 업데이트
  const statusPath = path.join(process.cwd(), 'status.md');
  let statusContent = readFileSafe(statusPath);
  if (!statusContent.trim()) {
    statusContent = `# 프로젝트 상태 (status.md)\n\n## 현재 상태\n- 마지막 병합: ${mergedAt} by ${mergedBy}\n- 관련 작업: ${taskId}\n\n## 기록\n- ${mergedAt}: ${taskId} 병합 (PR #${prNumber}) - ${prTitle}\n`;
  } else {
    // update current status section
    const currentSection = `## 현재 상태\n- 마지막 병합: ${mergedAt} by ${mergedBy}\n- 관련 작업: ${taskId}\n`;
    if (statusContent.includes('## 현재 상태')) {
      statusContent = replaceSection(statusContent, /## 현재 상태[\s\S]*?(?=\n#{1,6} |$)/, currentSection);
    } else {
      statusContent += '\n\n' + currentSection + '\n';
    }
    // append to history
    if (statusContent.includes('## 기록')) {
      statusContent = statusContent.replace(
        /## 기록[\s\S]*$/,
        (m) => m + `\n- ${mergedAt}: ${taskId} 병합 (PR #${prNumber}) - ${prTitle}`
      );
    } else {
      statusContent += `\n## 기록\n- ${mergedAt}: ${taskId} 병합 (PR #${prNumber}) - ${prTitle}\n`;
    }
  }
  writeFileEnsured(statusPath, statusContent);

  // 3) README.md 진행상황 업데이트
  const readmePath = path.join(process.cwd(), 'README.md');
  let readmeContent = readFileSafe(readmePath) || '# README\n';
  const progressSection = `## 진행상황\n- ${mergedAt}: ${taskId} 완료 (PR #${prNumber}) - ${prTitle}`;
  if (readmeContent.includes('## 진행상황')) {
    readmeContent = readmeContent.replace(
      /## 진행상황[\s\S]*?(?=\n#{1,6} |$)/,
      (m) => m.trim() + `\n- ${mergedAt}: ${taskId} 완료 (PR #${prNumber}) - ${prTitle}\n`
    );
  } else {
    readmeContent += `\n\n${progressSection}\n`;
  }
  writeFileEnsured(readmePath, readmeContent);

  // 4) tasks.md 완료 표시
  const tasksPath = path.join(process.cwd(), 'tasks.md');
  let tasksContent = readFileSafe(tasksPath);
  if (!tasksContent.trim()) {
    tasksContent = `# Tasks\n\n## 완료됨\n- [x] ${taskId} - ${prTitle} (PR #${prNumber})\n`;
  } else {
    // Try to mark existing task line as done, else append to Done
    const lineRx = new RegExp(`(^.*${taskId}.*$)`, 'mi');
    if (lineRx.test(tasksContent)) {
      tasksContent = tasksContent.replace(lineRx, (line) => line.replace('- [ ]', '- [x]'));
    } else {
      if (tasksContent.includes('## 완료됨')) {
        tasksContent = tasksContent.replace(
          /## 완료됨[\s\S]*$/,
          (m) => m + `\n- [x] ${taskId} - ${prTitle} (PR #${prNumber})`
        );
      } else {
        tasksContent += `\n\n## 완료됨\n- [x] ${taskId} - ${prTitle} (PR #${prNumber})\n`;
      }
    }
  }
  writeFileEnsured(tasksPath, tasksContent);

  console.log(`Updated docs for ${taskId} (PR #${prNumber}).`);
}

main();


