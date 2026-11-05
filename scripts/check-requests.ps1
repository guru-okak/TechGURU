param(
    [string]$Base = 'http://127.0.0.1:8787',
    [ValidateSet(10,13,16)][int]$Hour = 10,
    [string]$Day = '',
    [int]$ServiceId = 1,
    [int]$MasterId = 1
)
$ErrorActionPreference = 'Stop'
$Base = $Base.TrimEnd('/')
if (-not $Day) { $Day = [DateTime]::UtcNow.AddDays(1).ToString('yyyy-MM-dd') }

# All HTTP calls use cookies and double-submit CSRF. This script creates three demo requests.
function Invoke-TechGuruApi {
    param($Session, [string]$Path, [string]$Method = 'GET', $Body)
    $parameters = @{ Uri="$Base$Path"; Method=$Method; WebSession=$Session; ErrorAction='Stop' }
    if ($Method -ne 'GET') {
        $parameters.Headers = @{ 'X-CSRF-Token'=$Session.Cookies.GetCookies([uri]$Base)['csrf_token'].Value }
    }
    if ($PSBoundParameters.ContainsKey('Body')) {
        $parameters.ContentType = 'application/json; charset=utf-8'
        $parameters.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 5))
    }
    Invoke-RestMethod @parameters
}
function New-TechGuruSession {
    param([string]$Email,[string]$Password)
    $session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    Invoke-RestMethod "$Base/api/auth/csrf" -WebSession $session | Out-Null
    Invoke-TechGuruApi -Session $session -Path '/api/auth/login' -Method POST -Body @{email=$Email;password=$Password} | Out-Null
    return $session
}
function New-DemoRequest {
    param($Session,[string]$Description)
    $payload = @{
        service_id=$ServiceId
        service_mode='onsite'
        client_address='Москва, Центральная улица, 10'
        service_district='Центральный'
        description=$Description
        preferred_datetime=('{0}T{1:00}:00:00+03:00' -f $Day,$Hour)
        preferred_slot=('{0:00}:00-{1:00}:00' -f $Hour,($Hour+2))
    }
    (Invoke-TechGuruApi -Session $Session -Path '/api/requests' -Method POST -Body $payload).data
}

$client = New-TechGuruSession 'anna@techguru.example' 'ClientDemo2026!'
$admin = New-TechGuruSession 'admin@techguru.example' 'AdminDemo2026!'

# Branch A: new -> confirmed -> assigned.
$created = New-DemoRequest $client 'Проверка API: холодильник плохо охлаждает'
Write-Host ('Created: {0} / {1}' -f $created.request_number,$created.status)
$confirmed = (Invoke-TechGuruApi -Session $admin -Path "/api/admin/requests/$($created.id)/confirm" -Method PATCH).data
Write-Host ('Confirmed: {0}' -f $confirmed.status)
$assigned = (Invoke-TechGuruApi -Session $admin -Path "/api/admin/requests/$($created.id)/assign" -Method PATCH -Body @{master_id=$MasterId}).data
Write-Host ('Assigned: {0}; master_id={1}' -f $assigned.status,$assigned.master_id)

# Branch B: new -> cancelled. An assigned request cannot be cancelled by the client.
$toCancel = New-DemoRequest $client 'Проверка отмены заявки'
$cancelled = (Invoke-TechGuruApi -Session $client -Path "/api/requests/$($toCancel.id)/cancel" -Method PATCH -Body @{cancel_reason='Демонстрационная отмена'}).data
Write-Host ('Cancelled: {0}; by={1}' -f $cancelled.status,$cancelled.cancelled_by)

# Branch C: three no-answer comments, unchanged status and manual-review flag.
$toCall = New-DemoRequest $client 'Проверка обработки недозвона'
foreach ($attempt in 1..3) {
    $noAnswer = (Invoke-TechGuruApi -Session $admin -Path "/api/admin/requests/$($toCall.id)/no-answer" -Method POST -Body @{comment="Попытка $attempt"}).data
}
Write-Host ('No-answer: count={0}; status={1}; needs_manual_review={2}' -f $noAnswer.no_answer_count,$noAnswer.status,$noAnswer.needs_manual_review)

$detail = (Invoke-TechGuruApi -Session $client -Path "/api/requests/$($created.id)").data
$search = Invoke-TechGuruApi -Session $admin -Path ('/api/admin/requests?search='+[uri]::EscapeDataString($created.request_number))
Write-Host ('History: {0}; search results: {1}' -f $detail.history.Count,$search.pagination.total)
$mine = Invoke-TechGuruApi -Session $client -Path '/api/requests?limit=100'
$mine.data | Select-Object id,request_number,status,master_id

Invoke-TechGuruApi -Session $client -Path '/api/auth/logout' -Method POST | Out-Null
Invoke-TechGuruApi -Session $admin -Path '/api/auth/logout' -Method POST | Out-Null
