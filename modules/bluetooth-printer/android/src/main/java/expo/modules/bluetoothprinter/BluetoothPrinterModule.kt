package expo.modules.bluetoothprinter

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.util.UUID

/**
 * Prints raw ESC/POS bytes to a paired Bluetooth Classic (SPP) thermal printer.
 * The printer is paired in Android's Bluetooth settings; this module only lists
 * bonded devices and writes to one of them.
 */
class BluetoothPrinterModule : Module() {
  private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "App context is not available", null)

  private fun adapter(): BluetoothAdapter {
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    return manager?.adapter ?: throw CodedException("ERR_NO_BLUETOOTH", "This phone has no Bluetooth.", null)
  }

  private fun requireConnectPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
    ) {
      throw CodedException("ERR_PERMISSION", "Allow Nearby devices permission to use the printer.", null)
    }
  }

  @SuppressLint("MissingPermission")
  private fun openSocket(device: BluetoothDevice): BluetoothSocket {
    val attempts = listOf<() -> BluetoothSocket>(
      { device.createRfcommSocketToServiceRecord(sppUuid) },
      { device.createInsecureRfcommSocketToServiceRecord(sppUuid) },
      // Some low-cost printers only answer on RFCOMM channel 1.
      { device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType).invoke(device, 1) as BluetoothSocket },
    )
    var last: Exception? = null
    for (make in attempts) {
      var socket: BluetoothSocket? = null
      try {
        socket = make()
        socket.connect()
        return socket
      } catch (e: Exception) {
        last = e
        try { socket?.close() } catch (_: IOException) {}
      }
    }
    throw CodedException("ERR_CONNECT", "Could not connect to the printer. Make sure it is on and nearby.", last)
  }

  override fun definition() = ModuleDefinition {
    Name("BluetoothPrinter")

    Function("isEnabled") {
      try { adapter().isEnabled } catch (_: Exception) { false }
    }

    AsyncFunction("getPairedDevices") {
      requireConnectPermission()
      val a = adapter()
      if (!a.isEnabled) throw CodedException("ERR_BLUETOOTH_OFF", "Turn on Bluetooth first.", null)
      a.bondedDevices.map { d ->
        mapOf(
          "name" to (d.name ?: d.address),
          "address" to d.address,
          // 1536 = imaging (printers); used to sort printers first.
          "deviceClass" to (d.bluetoothClass?.majorDeviceClass ?: 0),
        )
      }
    }

    AsyncFunction("print") { address: String, base64: String ->
      requireConnectPermission()
      val a = adapter()
      if (!a.isEnabled) throw CodedException("ERR_BLUETOOTH_OFF", "Turn on Bluetooth first.", null)
      val device = try { a.getRemoteDevice(address) } catch (e: IllegalArgumentException) {
        throw CodedException("ERR_ADDRESS", "Printer address is not valid.", e)
      }
      if (a.isDiscovering) a.cancelDiscovery()
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      val socket = openSocket(device)
      try {
        val out = socket.outputStream
        // Small chunks with short pauses so cheap printers' buffers don't overflow.
        var i = 0
        while (i < bytes.size) {
          val end = minOf(i + 512, bytes.size)
          out.write(bytes, i, end - i)
          out.flush()
          i = end
          Thread.sleep(20)
        }
        // Give the printer time to drain before closing the link.
        Thread.sleep(400)
      } catch (e: IOException) {
        throw CodedException("ERR_WRITE", "The printer disconnected while printing.", e)
      } finally {
        try { socket.close() } catch (_: IOException) {}
      }
    }
  }
}
