import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 })

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, property_address, rent')
      .eq('user_id', userId)

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ error: 'Aucun locataire' }, { status: 404 })
    }

    const ids = tenants.map((t) => t.id)
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .in('tenant_id', ids)
      .gte('month', `${year}-01-01`)
      .lte('month', `${year}-12-31`)
      .order('month', { ascending: true })

    const { data: receipts } = await supabase
      .from('receipts')
      .select('payment_id, sent_at')
      .in('tenant_id', ids)

    const receiptMap: Record<string, string | null> = {}
    ;(receipts || []).forEach((r) => { receiptMap[r.payment_id] = r.sent_at })

    const tenantMap: Record<string, any> = {}
    tenants.forEach((t) => { tenantMap[t.id] = t })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Loya'
    const sheet = workbook.addWorksheet(`Paiements ${year}`)

    const ORANGE = 'FFE8590C'
    const INK = 'FF1A1208'
    const GREEN_BG = 'FFE3F3E4'
    const RED_BG = 'FFFCECE6'
    const LIGHT_GRAY = 'FFF5F0E8'
    const BLACK = 'FF000000'

    const thinBorder = {
      top: { style: 'thin' as const, color: { argb: BLACK } },
      left: { style: 'thin' as const, color: { argb: BLACK } },
      bottom: { style: 'thin' as const, color: { argb: BLACK } },
      right: { style: 'thin' as const, color: { argb: BLACK } },
    }

    sheet.columns = [
      { header: 'Locataire', key: 'name', width: 24 },
      { header: 'Adresse', key: 'address', width: 32 },
      { header: 'Loyer (€)', key: 'rent', width: 14 },
      { header: 'Mois', key: 'month', width: 16 },
      { header: 'Statut', key: 'status', width: 14 },
      { header: 'Date de paiement', key: 'paidAt', width: 24 },
      { header: 'Quittance envoyée', key: 'receipt', width: 26 },
    ]

    // Style en-têtes
    const headerRow = sheet.getRow(1)
    headerRow.height = 32
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = thinBorder
    })

    // Activer les filtres sur la ligne d'en-tête
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 7 },
    }

    // Données
    const dataRows: any[] = []
    ;(payments || []).forEach((p, idx) => {
      const tenant = tenantMap[p.tenant_id]
      const month = new Date(p.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      const paidAt = p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-FR') : '-'
      const receiptSent = receiptMap[p.id] ? new Date(receiptMap[p.id]!).toLocaleDateString('fr-FR') : '-'

      const row = sheet.addRow({
        name: tenant?.name || '',
        address: tenant?.property_address || '',
        rent: tenant?.rent || 0,
        month,
        status: p.is_paid ? 'Payé' : 'Non payé',
        paidAt,
        receipt: receiptSent,
      })

      dataRows.push({ row, isPaid: p.is_paid, rent: tenant?.rent || 0 })
      row.height = 22
      const isEven = idx % 2 === 0
      const bgColor = isEven ? 'FFFFFFFF' : LIGHT_GRAY

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 10, color: { argb: INK } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
        cell.alignment = { vertical: 'middle', horizontal: colNum === 3 ? 'right' : 'left', indent: colNum === 3 ? 0 : 1 }
        cell.border = thinBorder

        // Format monétaire pour la colonne loyer
        if (colNum === 3) {
          cell.numFmt = '#,##0.00 "€"'
        }
      })

      // Colorer le statut
      const statusCell = row.getCell(5)
      if (p.is_paid) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } }
        statusCell.font = { name: 'Arial', size: 10, color: { argb: 'FF1F7A37' }, bold: true }
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } }
        statusCell.font = { name: 'Arial', size: 10, color: { argb: 'FFB3361F' }, bold: true }
      }
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    // Ligne de total sous la colonne Loyer
    const totalPaid = dataRows.filter(r => r.isPaid).length
    const totalAmount = dataRows.filter(r => r.isPaid).reduce((sum, r) => sum + r.rent, 0)
    const lastDataRow = (payments || []).length + 1
    const totalRowNum = lastDataRow + 1

    const totalRow = sheet.addRow({
      name: 'TOTAL',
      address: '',
      rent: totalAmount,
      month: '',
      status: `${totalPaid} payés / ${(payments || []).length}`,
      paidAt: '',
      receipt: '',
    })

    totalRow.height = 28
    totalRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }
      cell.alignment = { vertical: 'middle', horizontal: colNum === 3 ? 'right' : 'left', indent: colNum === 3 ? 0 : 1 }
      cell.border = thinBorder
      if (colNum === 3) {
        cell.numFmt = '#,##0.00 "€"'
      }
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="loya_paiements_${year}.xlsx"`,
      },
    })

  } catch (error: any) {
    console.error('Erreur export:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
