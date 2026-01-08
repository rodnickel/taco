$path = "c:\Users\rodol\Apps\Git\observabilidade-it\apps\web\src"
$files = Get-ChildItem -Path $path -Recurse -Include "*.tsx","*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match "emerald") {
        $newContent = $content -replace "emerald", "orange"
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "Done!"
