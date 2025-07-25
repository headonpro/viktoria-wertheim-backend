$process = Start-Process -FilePath "npm" -ArgumentList "run", "develop" -PassThru -RedirectStandardOutput "startup.log" -RedirectStandardError "startup-error.log"
Start-Sleep -Seconds 15
Stop-Process -Id $process.Id -Force
Get-Content "startup.log" | Select-Object -Last 10
Get-Content "startup-error.log" | Select-Object -Last 10