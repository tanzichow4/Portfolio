# Usage: .\setup.ps1 [--fresh-git]
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$py = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { throw "Python 3.10+ not found" }
& $py scripts/setup.py @args
exit $LASTEXITCODE
