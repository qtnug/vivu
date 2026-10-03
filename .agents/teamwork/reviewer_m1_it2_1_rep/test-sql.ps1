$connectionString = "Server=localhost;Database=bus_ticketing_system;User Id=vivu_admin;Password=VivuAdmin@2026!;Connection Timeout=5;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connectionString)
try {
    $conn.Open()
    Write-Host "SUCCESS: Connected via .NET SqlClient with Server=localhost"
    $conn.Close()
} catch {
    Write-Host "FAILED: $($_.Exception.Message)"
}
