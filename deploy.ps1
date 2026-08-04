<#
.SYNOPSIS  一键部署：本地构建 -> 提交 -> 推送 -> 服务器部署 -> 核对
.EXAMPLE  .\deploy.ps1 -Message "fix: 登录按钮文案" -Files @("frontend/src/views/Login.vue")
.EXAMPLE  .\deploy.ps1 -Message "chore: 部署脚本"        # 仅已追踪改动 + 自动包含 deploy-remote.sh
#>
param(
  [Parameter(Mandatory=$true)][string]$Message,
  [string[]]$Files,
  [switch]$SkipBuild,
  [switch]$SkipPush
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$ROOT       = 'd:/app/code/code/career-gene-platform'
$SSH_KEY    = 'C:\Users\86198\.ssh\id_mentor_deploy'
$SSH_OPTS   = '-o StrictHostKeyChecking=no'
$REMOTE     = 'ubuntu@124.221.158.216'
$SERVER_DIR = '/opt/career-gene-platform'
$DEPLOY_SH  = "$ROOT/deploy-remote.sh"

function Step($n,$t){ Write-Host "`n==> [$n] $t" -ForegroundColor Cyan }
function Ssh($cmd){ & ssh -i $SSH_KEY $SSH_OPTS $REMOTE $cmd }
function Scp($src,$dst){ & scp -i $SSH_KEY $SSH_OPTS $src $dst }

# 1. 本地构建验证
if (-not $SkipBuild) {
  Step '1/5' '本地构建验证 (frontend + backend)'
  Push-Location "$ROOT/frontend"
  & npm run build *> build.log; $fe = $LASTEXITCODE
  Remove-Item -Force build.log -ErrorAction SilentlyContinue
  Pop-Location
  if ($fe -ne 0) { throw '前端构建失败，已中止（未提交/未推送）' }
  Push-Location "$ROOT/backend"
  & npm run build *> build.log; $be = $LASTEXITCODE
  Remove-Item -Force build.log -ErrorAction SilentlyContinue
  Pop-Location
  if ($be -ne 0) { throw '后端构建失败，已中止（未提交/未推送）' }
} else { Step '1/5' '跳过本地构建 (-SkipBuild)' }

# 2. 提交
Step '2/5' '提交'
Push-Location $ROOT
if ($Files -and $Files.Count) {
  & git add -- @Files
} else {
  & git add -u
}
& git add deploy-remote.sh
& git status --short
$cached = & git diff --cached --name-only
if (-not $cached) {
  Write-Host '没有可提交的改动，跳过 commit/push。'
  Pop-Location
} else {
  & git commit -q -m $Message
  $newHead = & git rev-parse HEAD
  Write-Host "commit: $newHead"
  Pop-Location

  # 3. 推送
  if (-not $SkipPush) {
    Step '3/5' '推送到 origin/main'
    & git push origin main
  } else { Step '3/5' '跳过推送 (-SkipPush)' }

  # 4. 部署
  Step '4/5' '上传部署脚本并后台触发'
  Scp $DEPLOY_SH "${REMOTE}:/tmp/do_deploy.sh"
  Ssh "bash /tmp/do_deploy.sh > /tmp/deploy.log 2>&1 < /dev/null & echo started"

  # 5. 轮询 + 核对
  Step '5/5' '轮询日志 + 健康检查 + 提交核对'
  $healthy = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 10
    $log = (Ssh "tail -n 6 /tmp/deploy.log") -join "`n"
    Write-Host $log
    $h = Ssh "curl -fsS http://localhost:8080/api/health"
    if ($h -match '"status":"ok"') { $healthy = $true; break }
  }
  $remoteHead = (Ssh "cd $SERVER_DIR && git rev-parse HEAD") -join ''
  Write-Host "`n--- 核对 ---"
  Write-Host "本地 HEAD : $newHead"
  Write-Host "服务器HEAD: $($remoteHead.Trim())"
  if ($remoteHead.Trim() -eq $newHead.Trim() -and $healthy) {
    Write-Host '部署成功：服务器已上线本次提交，健康检查 ok。' -ForegroundColor Green
  } else {
    Write-Warning '未完全核对通过，请手动检查 /tmp/deploy.log 与容器状态。'
  }
}
