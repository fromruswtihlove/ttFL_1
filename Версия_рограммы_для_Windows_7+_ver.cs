//программа, стирающие все временные фацлы. старшие определнного количетсва дней/недель/лет и т.п.

using System;
//without System.Management -Direct;
//with System.Net and with System.Windows instead of the System.Diagnostic and System.Collections.Generic 
using System.IO;
using System.Net;
using System.Windows;

static void _Do(string[] EventArgs)
{

    int DelDays = 1;    //установить диапазон дней можно в этой переменной

    string[] Files = Directory.GetFiles(path: @"C:\Windows\Temp"); //path к System.Windows;

    foreach (string file in Files)
    {
        FileInfo __FI__ = new FileInfo(file);

        if (__FI__.CreationTime < DateTime.Now.AddDays(-DelDays));
        {
            try
            {
                __FI__.Delete();
            }
            catch (Exception Exe) 
            {
                //pass
            }
        }
    }
}