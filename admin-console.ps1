$Host.UI.RawUI.WindowTitle = "WEWANTAGAIN // FOUNDER CONSOLE"

Clear-Host

function Center-Text {
    param(
        [string]$Text,
        [ConsoleColor]$Color = [ConsoleColor]::White
    )

    try {
        $Width = $Host.UI.RawUI.WindowSize.Width
    }
    catch {
        $Width = 120
    }

    $Padding = [Math]::Max(
        0,
        [Math]::Floor(
            ($Width - $Text.Length) / 2
        )
    )

    Write-Host (
        (" " * $Padding) + $Text
    ) -ForegroundColor $Color
}

function Type-Text {
    param(
        [string]$Text,
        [ConsoleColor]$Color = [ConsoleColor]::White,
        [int]$Delay = 12
    )

    foreach (
        $Character in
        $Text.ToCharArray()
    ) {
        Write-Host `
            -NoNewline `
            $Character `
            -ForegroundColor $Color

        Start-Sleep `
            -Milliseconds $Delay
    }

    Write-Host ""
}

function Loading-Line {
    param(
        [string]$Name
    )

    Write-Host ""
    Write-Host "  $Name" `
        -ForegroundColor DarkGray

    Write-Host "  [" `
        -NoNewline `
        -ForegroundColor DarkGray

    for (
        $i = 0;
        $i -lt 35;
        $i++
    ) {
        Write-Host "#" `
            -NoNewline `
            -ForegroundColor Magenta

        Start-Sleep `
            -Milliseconds 25
    }

    Write-Host "] 100%" `
        -ForegroundColor Green
}

function Status-Line {
    param(
        [string]$Name,
        [string]$Status = "ONLINE"
    )

    Write-Host "  [" `
        -NoNewline `
        -ForegroundColor DarkGray

    Write-Host " OK " `
        -NoNewline `
        -ForegroundColor Green

    Write-Host "] " `
        -NoNewline `
        -ForegroundColor DarkGray

    Write-Host $Name `
        -NoNewline `
        -ForegroundColor White

    $Padding =
        36 - $Name.Length

    if ($Padding -lt 1) {
        $Padding = 1
    }

    Write-Host (
        " " * $Padding
    ) -NoNewline

    Write-Host $Status `
        -ForegroundColor Green
}

$Logo = @"

 __        __ _____  __        __    _    _   _ _____
 \ \      / /| ____| \ \      / /   / \  | \ | |_   _|
  \ \ /\ / / |  _|    \ \ /\ / /   / _ \ |  \| | | |
   \ V  V /  | |___    \ V  V /   / ___ \| |\  | | |
    \_/\_/   |_____|    \_/\_/   /_/   \_\_| \_| |_|

     _        ____      _      ___  _   _
    / \      / ___|    / \    |_ _|| \ | |
   / _ \    | |  _    / _ \    | | |  \| |
  / ___ \   | |_| |  / ___ \   | | | |\  |
 /_/   \_\   \____| /_/   \_\ |___||_| \_|

"@

Write-Host $Logo `
    -ForegroundColor Magenta

Center-Text `
    -Text "============================================================" `
    -Color DarkGray

Center-Text `
    -Text "WEWANTAGAIN // PRIVATE ADMINISTRATIVE NETWORK" `
    -Color Cyan

Center-Text `
    -Text "============================================================" `
    -Color DarkGray

Write-Host ""

Type-Text `
    -Text "  Boot sequence initiated..." `
    -Color Cyan `
    -Delay 25

Loading-Line `
    -Name "Loading administrative core"

Loading-Line `
    -Name "Verifying project environment"

Loading-Line `
    -Name "Connecting owner modules"

Loading-Line `
    -Name "Preparing founder console"

Start-Sleep `
    -Milliseconds 500

Clear-Host

Write-Host $Logo `
    -ForegroundColor Magenta

Center-Text `
    -Text "============================================================" `
    -Color DarkGray

Center-Text `
    -Text "ACCESS GRANTED" `
    -Color Green

Center-Text `
    -Text "FOUNDER AUTHENTICATION SUCCESSFUL" `
    -Color Cyan

Center-Text `
    -Text "============================================================" `
    -Color DarkGray

Write-Host ""
Write-Host ""

Type-Text `
    -Text "  WELCOME BACK" `
    -Color DarkGray `
    -Delay 30

Type-Text `
    -Text "  MUHAMMED MERT" `
    -Color Magenta `
    -Delay 55

Write-Host ""

Write-Host "  +----------------------------------------------------------+" `
    -ForegroundColor DarkGray

Write-Host "  |                                                          |" `
    -ForegroundColor DarkGray

Write-Host "  |  ACCOUNT       : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "MUHAMMED MERT" `
    -ForegroundColor White

Write-Host "  |  ACCESS LEVEL  : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "FOUNDER / OWNER" `
    -ForegroundColor Magenta

Write-Host "  |  PROJECT       : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "WEWANTAGAIN" `
    -ForegroundColor Cyan

Write-Host "  |  NETWORK       : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "ADMINISTRATIVE CORE" `
    -ForegroundColor Cyan

Write-Host "  |  ACCESS        : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "AUTHORIZED" `
    -ForegroundColor Green

Write-Host "  |  STATUS        : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "ONLINE" `
    -ForegroundColor Green

Write-Host "  |                                                          |" `
    -ForegroundColor DarkGray

Write-Host "  +----------------------------------------------------------+" `
    -ForegroundColor DarkGray

Write-Host ""

$ProjectPath = (
    Get-Location
).Path

$GitBranch = "UNKNOWN"

try {
    $GitBranch = (
        git branch --show-current 2>$null |
        Out-String
    ).Trim()

    if (
        [string]::IsNullOrWhiteSpace(
            $GitBranch
        )
    ) {
        $GitBranch = "UNKNOWN"
    }
}
catch {
    $GitBranch = "UNAVAILABLE"
}

$NodeVersion = "UNKNOWN"

try {
    $NodeVersion = (
        node --version 2>$null |
        Out-String
    ).Trim()

    if (
        [string]::IsNullOrWhiteSpace(
            $NodeVersion
        )
    ) {
        $NodeVersion = "UNKNOWN"
    }
}
catch {
    $NodeVersion = "UNAVAILABLE"
}

$RepoStatus = "UNKNOWN"

try {
    $Changes = @(
        git status --porcelain 2>$null
    )

    if (
        $Changes.Count -eq 0
    ) {
        $RepoStatus = "CLEAN"
    }
    else {
        $RepoStatus = "MODIFIED"
    }
}
catch {
    $RepoStatus = "UNKNOWN"
}

Write-Host "  SYSTEM INFORMATION" `
    -ForegroundColor Cyan

Write-Host "  ------------------------------------------------------------" `
    -ForegroundColor DarkGray

Write-Host "  LOCAL TIME      : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host (
    Get-Date -Format "dd.MM.yyyy HH:mm:ss"
) -ForegroundColor White

Write-Host "  MACHINE         : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host $env:COMPUTERNAME `
    -ForegroundColor White

Write-Host "  WINDOWS USER    : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host $env:USERNAME `
    -ForegroundColor White

Write-Host "  PROJECT         : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "WEWANTAGAIN" `
    -ForegroundColor Magenta

Write-Host "  PROJECT PATH    : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host $ProjectPath `
    -ForegroundColor White

Write-Host "  GIT BRANCH      : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host $GitBranch `
    -ForegroundColor Cyan

Write-Host "  REPOSITORY      : " `
    -NoNewline `
    -ForegroundColor DarkGray

if (
    $RepoStatus -eq "CLEAN"
) {
    Write-Host "CLEAN" `
        -ForegroundColor Green
}
elseif (
    $RepoStatus -eq "MODIFIED"
) {
    Write-Host "MODIFIED" `
        -ForegroundColor Yellow
}
else {
    Write-Host "UNKNOWN" `
        -ForegroundColor DarkGray
}

Write-Host "  NODE VERSION    : " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host $NodeVersion `
    -ForegroundColor Cyan

Write-Host ""

Write-Host "  ADMINISTRATIVE MODULES" `
    -ForegroundColor Cyan

Write-Host "  ------------------------------------------------------------" `
    -ForegroundColor DarkGray

Status-Line `
    -Name "Authentication Core"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "Admin Management"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "Campaign Management"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "User Management"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "IP Protection"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "Audit Logging"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "Maintenance System"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "Global Notifications"

Start-Sleep -Milliseconds 80

Status-Line `
    -Name "Site Management"

Write-Host ""

Write-Host "  SECURITY LAYER STATUS" `
    -ForegroundColor Cyan

Write-Host "  ------------------------------------------------------------" `
    -ForegroundColor DarkGray

Status-Line `
    -Name "Admin Session Verification"

Status-Line `
    -Name "IP Ban System"

Status-Line `
    -Name "User Ban System"

Status-Line `
    -Name "Session Revocation"

Status-Line `
    -Name "Administrative Audit Logs"

Write-Host ""

Write-Host "  DEPLOYMENT" `
    -ForegroundColor Cyan

Write-Host "  ------------------------------------------------------------" `
    -ForegroundColor DarkGray

Write-Host "  [" `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host " LIVE " `
    -NoNewline `
    -ForegroundColor Green

Write-Host "] " `
    -NoNewline `
    -ForegroundColor DarkGray

Write-Host "WEWANTAGAIN PRODUCTION NETWORK" `
    -ForegroundColor White

Write-Host ""

Center-Text `
    -Text "============================================================" `
    -Color DarkGray

Center-Text `
    -Text "WEWANTAGAIN ADMINISTRATIVE NETWORK" `
    -Color Magenta

Center-Text `
    -Text "FOUNDER ACCESS // MUHAMMED MERT" `
    -Color Cyan

Center-Text `
    -Text "AUTHORIZED OWNER TERMINAL" `
    -Color Green

Center-Text `
    -Text "============================================================" `
    -Color DarkGray

Write-Host ""
Write-Host ""

Type-Text `
    -Text "  OWNER CONSOLE READY." `
    -Color Green `
    -Delay 45

Type-Text `
    -Text "  Waiting for founder command..." `
    -Color DarkGray `
    -Delay 20

Write-Host ""